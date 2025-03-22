
import PageLayout from "@/components/PageLayout";

const Features = () => {
  return (
    <PageLayout>
      <section className="container py-16 md:py-24">
        <h1 className="text-4xl font-bold text-center mb-8">Features</h1>
        <p className="text-lg text-center text-slate-700 max-w-3xl mx-auto">
          Discover the powerful features that make CircuitSim the ideal platform for electronics simulation and learning.
        </p>
        
        {/* Feature content will be added in a future step */}
        <div className="h-96 flex items-center justify-center">
          <p className="text-slate-500">Feature details coming soon...</p>
        </div>
      </section>
    </PageLayout>
  );
};

export default Features;
