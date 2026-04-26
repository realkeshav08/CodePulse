import ComplexityChart from "@/components/ComplexityChart";
import { Form } from "@/components/Form";
import SelectFeatures from "@/components/SelectFeatures";
import SendButton from "@/components/SendButton";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import { Card } from "@/components/ui/card";
import { marked } from "marked";
import { useState } from "react";
import run, { runJson } from "../utils/gemini";

export default function ParentForm() {
  const [textareaValue, setTextareaValue] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [complexityData, setComplexityData] = useState(null);
  const [securityVulnerabilities, setSecurityVulnerabilities] = useState([]);

  const handleFeatureSelect = (feature) => setSelectedFeature(feature);
  const handleFileUpload = (content) => setTextareaValue(content);
  const clearTextarea = () => {
    setTextareaValue("");
    setAiResponse("");
    setComplexityData(null);
    setSecurityVulnerabilities([]);
  };

  const submitCode = async () => {
    if (!selectedFeature || selectedFeature === "Select a feature") {
      alert("Please choose which task you want to perform.");
      return;
    }

    if (!textareaValue.trim()) {
      alert("Please paste your code first.");
      return;
    }

    setLoading(true);

    try {
      if (selectedFeature === "Complexity Analysis") {
        const prompt = `Analyze the following code and return the time and space complexity.
CODE:
${textareaValue}

Return a JSON object with keys "time-complexity" and "space-complexity". Values should be Big-O notation like "O(n)", "O(n^2)", etc.`;

        const parsed = await runJson(prompt);
        if (parsed && parsed["time-complexity"]) {
          setComplexityData(parsed);
          setAiResponse("");
          setSecurityVulnerabilities([]);
        } else {
          setAiResponse("Error: Could not analyze complexity. Please try again.");
          setComplexityData(null);
        }

      } else if (selectedFeature === "Security Vulnerability Detection") {
        const prompt = `Analyze the following code for security vulnerabilities.
CODE:
${textareaValue}

Return a JSON object with keys "name" (brief vulnerability description) and "risk-percentage" (a number from 0 to 100).`;

        const parsed = await runJson(prompt);
        if (parsed) {
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setSecurityVulnerabilities(arr);
          setAiResponse("");
          setComplexityData(null);
        } else {
          setAiResponse("Error: Could not perform security analysis. Please try again.");
          setSecurityVulnerabilities([]);
        }

      } else {
        // Text-based features (explanation, docs, quality, etc.)
        const prompt = `ACT AS AN AI CODING ASSISTANT.
Task: ${selectedFeature}
Code:
${textareaValue}

Provide clear, professional insights with explanations.`;

        const result = await run(prompt);
        if (result && result.startsWith("Error:")) {
          setAiResponse(result);
        } else if (result) {
          const formattedResponse = marked.parse(result);
          setAiResponse(formattedResponse);
        } else {
          setAiResponse("Error: No response received from AI.");
        }
        setComplexityData(null);
        setSecurityVulnerabilities([]);
      }

    } catch (error) {
      console.error("Error during API call:", error.message || error);
      setAiResponse("Error during API call: " + (error.message || error));
      setComplexityData(null);
      setSecurityVulnerabilities([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 glass-card rounded-3xl shadow-2xl flex flex-col w-full gap-8 mt-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-center">Analyze Your Logic</h2>
        <p className="text-muted-foreground text-center">Paste your code below to begin the deep-dive analysis.</p>
      </div>

      <div className="space-y-6">
        <Form
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-secondary/80 rounded-2xl border border-border/50">
          <SelectFeatures
            onClear={clearTextarea}
            onFileUpload={handleFileUpload}
            onFeatureSelect={handleFeatureSelect}
          />
          <SendButton onSubmit={submitCode} loading={loading} />
        </div>
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Consulting the AI experts...</p>
        </div>
      )}

      {aiResponse && !complexityData && !securityVulnerabilities.length && !loading && (
        <div className="mt-8 p-6 rounded-2xl bg-secondary/50 border border-border/50 text-left max-w-none overflow-auto shadow-sm">
          <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: aiResponse }} />
        </div>
      )}

      {complexityData && !loading && (
        <div className="mt-8 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-l-4 border-l-primary shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Time Complexity
              </h2>
              <p className="text-3xl font-mono font-bold text-primary">{complexityData["time-complexity"]}</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-blue-400 shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                Space Complexity
              </h2>
              <p className="text-3xl font-mono font-bold text-blue-500">{complexityData["space-complexity"]}</p>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComplexityChart
              complexity={complexityData["time-complexity"]}
              title="Time Complexity"
            />
            <ComplexityChart
              complexity={complexityData["space-complexity"]}
              title="Space Complexity"
            />
          </div>
        </div>
      )}

      {securityVulnerabilities.length > 0 && !loading && (
        <div className="mt-8 space-y-4 animate-in slide-in-from-right-4 duration-500">
          <h3 className="text-xl font-bold flex items-center gap-2">
            🛡️ Security & Risk Assessment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityVulnerabilities.map((vulnerability, index) => (
              <VulnerabilityCard
                key={index}
                title={vulnerability.name}
                risk={vulnerability["risk-percentage"]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
