import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import CredibilityBar from '../components/landing/CredibilityBar';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import AIAssistantShowcase from '../components/landing/AIAssistantShowcase';
import DashboardPreview from '../components/landing/DashboardPreview';
import SecuritySection from '../components/landing/SecuritySection';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-900">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white" style={{ scrollBehavior: 'smooth' }}>
      <LandingNavbar />
      <HeroSection />
      <CredibilityBar />
      <FeaturesSection />
      <HowItWorksSection />
      <AIAssistantShowcase />
      <DashboardPreview />
      <SecuritySection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
