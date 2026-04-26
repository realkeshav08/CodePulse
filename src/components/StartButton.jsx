import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function StartButton() {
  return (
    <div className="flex justify-center mb-16">
      <Link to="/chat">
        <Button size="lg" className="rounded-full px-8 h-12 text-lg shadow-lg hover:shadow-primary/25 transition-all duration-300">
          Analyze Your Code <ArrowRightIcon className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}

