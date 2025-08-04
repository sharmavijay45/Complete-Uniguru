import React from "react";
import { Link } from "react-router-dom";
import Signupbox from "../components/Signupbox";
import StarsCanvas from "../components/StarBackground";

const SignupPage: React.FC = () => {
  return (
    <div className="relative">
      {/* Star Background */}
      <div className="fixed inset-0 z-0">
        <StarsCanvas />
      </div>

      {/* Signup Container */}
      <div className="relative z-10">
        <Signupbox />
      </div>

      {/* Additional Links */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 text-center space-y-2 z-20">
        <div className="text-white text-sm font-poppins space-y-1">
          <p>
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-300 hover:text-blue-200 underline transition-colors duration-200"
            >
              Login here
            </Link>
          </p>
          <p>
            <Link
              to="/forgot-password"
              className="text-blue-300 hover:text-blue-200 underline transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </p>
          <p>
            <Link
              to="/"
              className="text-white/70 hover:text-white underline transition-colors duration-200"
            >
              Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
