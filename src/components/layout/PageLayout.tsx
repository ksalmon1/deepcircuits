import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";

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
