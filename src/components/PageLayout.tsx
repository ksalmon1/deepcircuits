
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface PageLayoutProps {
  children: React.ReactNode;
  withHeader?: boolean;
  withFooter?: boolean;
  withBreadcrumbs?: boolean;
}

const PageLayout = ({ 
  children, 
  withHeader = true, 
  withFooter = true,
  withBreadcrumbs = true
}: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      {withHeader && <Header />}
      <main className="flex-1 overflow-y-auto">
        <div className="container">
          {withBreadcrumbs && <Breadcrumbs />}
          {children}
        </div>
      </main>
      {withFooter && <Footer />}
    </div>
  );
};

export default PageLayout;
