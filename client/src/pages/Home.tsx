import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home 页面重定向到 Dashboard
 */
export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/");
  }, [setLocation]);

  return null;
}
