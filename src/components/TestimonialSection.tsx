
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "CircuitSim has revolutionized how I teach electronics to my students. The real-time feedback makes learning intuitive and engaging.",
    author: "Dr. Sarah Chen",
    role: "Professor of Electrical Engineering",
    avatar: "SC",
  },
  {
    quote:
      "As a hobbyist, I've tried many circuit simulators, but CircuitSim's ease of use and powerful features make it my go-to platform for all my projects.",
    author: "Michael Rodriguez",
    role: "Electronics Enthusiast",
    avatar: "MR",
  },
  {
    quote:
      "The collaboration features in CircuitSim have been game-changing for our robotics club. We can now work together remotely on circuit designs.",
    author: "Priya Patel",
    role: "Student, Robotics Club Lead",
    avatar: "PP",
  },
];

const TestimonialSection = () => {
  return (
    <section className="bg-neutral-50 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            What Our Users Say
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Join thousands of students, educators, and hobbyists who love CircuitSim.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <p className="text-slate-600">"{testimonial.quote}"</p>
              <div className="mt-6 flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
