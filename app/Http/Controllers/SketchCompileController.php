<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

/**
 * Compiles Arduino sketches to AVR hex locally with arduino-cli, so user
 * code never leaves this machine. Results are cached on disk by sketch
 * hash: re-compiling an unchanged sketch is instant.
 */
class SketchCompileController extends Controller
{
    private const FQBN = 'arduino:avr:uno';
    private const TIMEOUT_SECONDS = 120;
    private const MAX_SKETCH_BYTES = 200_000;

    public function compile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sketch' => ['required', 'string', 'max:'.self::MAX_SKETCH_BYTES],
        ]);
        $sketch = $validated['sketch'];

        $cacheFile = storage_path('app/sketch-cache/'.sha1(self::FQBN.$sketch).'.json');
        if (File::exists($cacheFile)) {
            return response()->json(json_decode(File::get($cacheFile), true));
        }

        $cli = config('services.arduino_cli.path');
        if (! $this->cliAvailable($cli)) {
            return response()->json([
                'message' => 'arduino-cli is not installed on the server. Install it and the AVR core '
                    .'(arduino-cli core install arduino:avr), or set ARDUINO_CLI_PATH in .env.',
            ], 503);
        }

        // arduino-cli requires the .ino to live in a directory of the same name.
        $workDir = storage_path('app/sketch-build/'.Str::uuid());
        $sketchDir = $workDir.'/sketch';
        $buildDir = $workDir.'/build';
        $objDir = $workDir.'/obj';
        File::ensureDirectoryExists($sketchDir);
        File::ensureDirectoryExists($buildDir);
        File::ensureDirectoryExists($objDir);
        File::put($sketchDir.'/sketch.ino', $sketch);

        try {
            $result = Process::timeout(self::TIMEOUT_SECONDS)
                ->env($this->cliEnvironment())
                ->run([
                    $cli, 'compile',
                    '--fqbn', self::FQBN,
                    '--output-dir', $buildDir,
                    // Explicit build dir: the default derives from the temp /
                    // home directories, which server processes may not have.
                    '--build-path', $objDir,
                    '--no-color',
                    $sketchDir,
                ]);

            $hexFile = $buildDir.'/sketch.ino.hex';
            if (! $result->successful() || ! File::exists($hexFile)) {
                return response()->json([
                    'message' => 'Sketch failed to compile.',
                    'stdout' => $result->output(),
                    'stderr' => $result->errorOutput(),
                ], 422);
            }

            $payload = [
                'hex' => File::get($hexFile),
                'stdout' => $result->output(),
                'stderr' => $result->errorOutput(),
            ];
            File::ensureDirectoryExists(dirname($cacheFile));
            File::put($cacheFile, json_encode($payload));

            return response()->json($payload);
        } finally {
            File::deleteDirectory($workDir);
        }
    }

    private function cliAvailable(string $cli): bool
    {
        try {
            return Process::timeout(15)
                ->env($this->cliEnvironment())
                ->run([$cli, 'version'])
                ->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Point arduino-cli at its directories explicitly so it never needs to
     * resolve a home directory (server processes often run without one).
     * The sketchbook ("user") dir also gives project libraries a home.
     */
    private function cliEnvironment(): array
    {
        $tmpDir = storage_path('app/arduino-tmp');
        File::ensureDirectoryExists($tmpDir);
        $env = [
            'ARDUINO_DIRECTORIES_USER' => storage_path('app/arduino-user'),
            'ARDUINO_BUILD_CACHE_PATH' => storage_path('app/arduino-build-cache'),
            // arduino-cli falls back to the system root when the server
            // process has no TMP; give it a writable one.
            'TMP' => $tmpDir,
            'TEMP' => $tmpDir,
            'TMPDIR' => $tmpDir,
        ];
        $dataDir = config('services.arduino_cli.data_dir');
        if ($dataDir) {
            $env['ARDUINO_DIRECTORIES_DATA'] = $dataDir;
            $env['ARDUINO_DIRECTORIES_DOWNLOADS'] = $dataDir.DIRECTORY_SEPARATOR.'staging';
        }

        return $env;
    }
}
