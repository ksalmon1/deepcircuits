import { Battery, Lightbulb, Code, Share2, History, Download } from "lucide-react";

const features = [
  {
    icon: <Battery className="h-6 w-6 text-primary" />,
    title: "Interactive Circuit Building",
    description:
      "Drag-and-drop components with intuitive wiring and pin connections",
  },
  {
    icon: <Lightbulb className="h-6 w-6 text-primary" />,
    title: "Real-time Simulation",
    description:
      "See your circuit behavior with immediate visual feedback",
  },
  {
    icon: <Code className="h-6 w-6 text-primary" />,
    title: "Microcontroller Programming",
    description:
      "Write and compile Arduino/ESP32 code directly in your browser",
  },
  {
    icon: <Share2 className="h-6 w-6 text-primary" />,
    title: "Real-time Collaboration",
    description:
      "Work together with teammates on shared circuit projects",
  },
  {
    icon: <History className="h-6 w-6 text-primary" />,
    title: "Version Control",
    description:
      "Track changes and revert to previous versions of your circuits",
  },
  {
    icon: <Download className="h-6 w-6 text-primary" />,
    title: "Import/Export",
    description:
      "Share your projects or import existing ones to continue your work",
  },
];

const FeaturesSection = () => {
  return (
    <section className="bg-neutral-50 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Powerful Features for Electronic Design
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            DeepCircuits provides all the tools you need to design, test, and collaborate on electronic circuits.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 rounded-full bg-primary/10 p-2 w-fit">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
