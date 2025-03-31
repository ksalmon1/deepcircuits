
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import ProfileSection from "@/components/ProfileSection";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const ProfileSettings = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <PageLayout>
      <div className="container py-12">
        <h1 className="mb-8 text-3xl font-bold">Profile Settings</h1>
        <ProfileSection />
      </div>
    </PageLayout>
  );
};

export default ProfileSettings;
