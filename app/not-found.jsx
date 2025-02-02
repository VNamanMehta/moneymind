"use client";

import { MoveLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-3xl mx-auto text-center relative">
        {/* Decorative circles */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-2xl" />
        </div>

        {/* Main content */}
        <div
          className={`space-y-6 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* 404 heading */}
          <h1 className="text-[150px] font-bold leading-none tracking-tight gradient-title lg:text-[200px]">
            404
          </h1>

          {/* Messages */}
          <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Oops! Page not found
            </h2>
            <p className="mx-auto max-w-md text-muted-foreground">
              The page you're looking for doesn't exist or has been moved. Let's
              get you back on track.
            </p>
          </div>

          {/* Back to home button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium transition-transform hover:scale-105 active:scale-95"
          >
            <MoveLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Decorative elements */}
          {mounted && (
            <div className="absolute inset-0 -z-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full bg-primary/20
                    animate-[ping_4s_ease-in-out_infinite]
                  `}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

