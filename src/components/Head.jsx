export default function Head() {
  return (
    <div className="flex flex-col items-center justify-center pt-20 pb-10">
      <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-4">
        CodePulse AI
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-2xl text-center px-4">
        Deep-dive into your codebase with intelligent performance metrics, 
        security audits, and architectural insights.
      </p>
    </div>
  );
}

