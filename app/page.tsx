import type { Metadata } from "next";
import VectorApp from "./VectorApp";

export const metadata: Metadata = {
  title: "VECTOR — Live GPS Tracking",
  description: "A fictional GPS simulation interface for screen production.",
};

export default function Home() {
  return <VectorApp />;
}
