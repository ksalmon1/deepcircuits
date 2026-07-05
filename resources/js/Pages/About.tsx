
import PageLayout from "@/components/layout/PageLayout";

const About = () => {
  return (
    <PageLayout>
      <section className="container py-16 md:py-24">
        <h1 className="text-4xl font-bold text-center mb-8">About DeepCircuits</h1>
        <p className="text-lg text-center text-slate-700 max-w-3xl mx-auto">
          Learn about our mission to make electronics education accessible to everyone.
        </p>
        
        {/* About content will be added in a future step */}
        <div className="h-96 flex items-center justify-center">
          <p className="text-slate-500">About content coming soon...</p>
        </div>
      </section>
    </PageLayout>
  );
};

export default About;
