
import PageLayout from "@/components/PageLayout";

const Pricing = () => {
  return (
    <PageLayout>
      <section className="container py-16 md:py-24">
        <h1 className="text-4xl font-bold text-center mb-8">Pricing</h1>
        <p className="text-lg text-center text-slate-700 max-w-3xl mx-auto">
          Simple, transparent pricing for everyone from students to professionals.
        </p>
        
        {/* Pricing content will be added in a future step */}
        <div className="h-96 flex items-center justify-center">
          <p className="text-slate-500">Pricing details coming soon...</p>
        </div>
      </section>
    </PageLayout>
  );
};

export default Pricing;
