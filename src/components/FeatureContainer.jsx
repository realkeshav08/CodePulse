import { features } from "@/data/features";
import Features from "./Features";

function FeatureContainer() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Features 
            key={index} 
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
}

export default FeatureContainer;

