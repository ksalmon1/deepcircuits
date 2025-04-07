import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Chen",
    title: "High School Physics Teacher",
    image: "/images/testimonials/sarah.jpg",
    text: "DeepCircuits has revolutionized how I teach electronics to my students. The real-time feedback makes learning intuitive and engaging.",
  },
  {
    name: "Alex Johnson",
    title: "Electronics Hobbyist",
    image: "/images/testimonials/alex.jpg",
    text: "As a hobbyist, I've tried many circuit simulators, but DeepCircuits' ease of use and powerful features make it my go-to platform for all my projects.",
  },
  {
    name: "Maria Garcia",
    title: "Robotics Club Advisor",
    image: "/images/testimonials/maria.jpg",
    text: "The collaboration features in DeepCircuits have been game-changing for our robotics club. We can now work together remotely on circuit designs.",
  },
  // Add more testimonials as needed
];

export function TestimonialSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
            What Our Users Say
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="flex flex-col">
              <CardContent className="p-6 flex-grow">
                <p className="text-slate-700 italic mb-6">"{testimonial.text}"</p>
              </CardContent>
              <CardFooter className="p-6 pt-0 border-t flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.title}</p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        <p className="mt-12 text-center text-lg text-slate-600">
          Join thousands of students, educators, and hobbyists who love DeepCircuits.
        </p>
      </div>
    </section>
  );
}
