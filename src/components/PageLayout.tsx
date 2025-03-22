
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageLayoutProps {
  children: React.ReactNode;
  withHeader?: boolean;
  withFooter?: boolean;
}

const PageLayout = ({ 
  children, 
  withHeader = true, 
  withFooter = true 
}: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      {withHeader && <Header />}
      <main className="flex-1">{children}</main>
      {withFooter && <Footer />}
    </div>
  );
};

export default PageLayout;
