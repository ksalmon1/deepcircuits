import { Button } from "@/components/ui/button";
import { Link } from '@/lib/router';

const HeroSection = () => {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Design and Simulate Electronic Circuits in Your Browser
            </h1>
            <p className="mt-6 text-lg text-slate-600">
              DeepCircuits provides an intuitive platform for hobbyists and students to create, simulate, and collaborate on electronics projects with real-time feedback.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/signup">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/features">Learn More</Link>
              </Button>
            </div>
          </div>
          <div className="hidden rounded-lg bg-neutral-100 p-8 md:block">
            <div className="aspect-video h-full w-full rounded-md bg-neutral-200 flex items-center justify-center">
              <p className="text-slate-500">Circuit Editor Preview</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
