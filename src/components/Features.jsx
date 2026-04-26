import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Features({ title, description }) {
  return (
    <Card className="glass-card w-full h-full p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group">
      <CardHeader className="p-0 mb-4">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-muted-foreground leading-relaxed text-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default Features;

