import { Suspense } from "react";
import AdminSignInClient from "./AdminSignInClient";

export default function AdminSignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f7fb]" />}>
      <AdminSignInClient />
    </Suspense>
  );
}
