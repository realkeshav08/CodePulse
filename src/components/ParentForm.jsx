import ComplexityChart from "@/components/ComplexityChart";
import { Form } from "@/components/Form";
import SelectFeatures from "@/components/SelectFeatures";
import SendButton from "@/components/SendButton";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import { marked } from "marked";
import { useState } from "react";
import run from "../utils/gemini";

export default function ParentForm() {
  const [textareaValue, setTextareaValue] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [complexityData, setComplexityData] = useState(null);
  const [securityVulnerabilities, setSecurityVulnerabilities] = useState([]);

  const clearTextarea = () => {
    setTextareaValue("");
    setComplexityData(null);
    setSecurityVulnerabilities([]);
  };

  const submitCode = async () => {
    if (!selectedFeature || selectedFeature === "Select a feature") {
      alert("Please choose which task you want to perform.");
      return;
    }

    let prompt;
    if (selectedFeature === "Complexity Analysis") {
      prompt = `Here is the relevant code:\n\n${textareaValue}\n\nPlease provide the Time and Space complexity of the given code in the following JSON format:\n{\n  "time-complexity": "AI response",\n  "space-complexity": "AI response"\n}\n\nDon't give me any other text. Remember that don't give me any other text in that json`;
    } else if (selectedFeature === "Security Vulnerability Detection") {
      prompt = `Here is the relevant code:\n\n${textareaValue}\n\nPlease analyze the code for any code improvement to reduce chances of risk in my code and respond with a JSON object containing the following information:\n{\n  "name": "Name of the code improvement to reduce chances of risk",\n "risk-percentage": "Percentage of risk out of 100%"\n}\n\nProvide only the JSON object without any additional text.`;
    } else {
      prompt = `You are an AI expert in software development. Your task is to assist with the following: \n- Feature: ${selectedFeature}\n- Objective: Analyze and execute the task as it relates to the provided code, efficiency, and overall code quality.\n\nHere is the relevant code:\n\n${textareaValue}\n\nPlease generate insights, improvements, or solutions based on the task above. Be clear, professional, and provide only important explanations for any changes or recommendations you suggest.\n\nAfter explaining a point, add <br> tag for line breaking.`;
    }

    setLoading(true);

    try {
      const result = await run(prompt);
      if (!result) {
        throw new Error("Received null or undefined response.");
      }

      console.log("Raw AI response:", result.replace(/```json|```/g, '').trim());

      if (selectedFeature === "Complexity Analysis") {
        // Try to parse JSON directly if no backticks are present
        let jsonString = result.trim();
        try {
          const parsedResponse = JSON.parse(jsonString);
          setComplexityData(parsedResponse);
          setAiResponse("");
          setSecurityVulnerabilities([]);
        } catch (error) {
          console.error("Error parsing response:", error);
          setAiResponse("Error parsing response, Please Try Again!");
          setComplexityData(null);
          setSecurityVulnerabilities([]);
        }
      } else if (selectedFeature === "Security Vulnerability Detection") {
        // Clean the result by removing the ```json``` tags
        let jsonString = result.replace(/```json|```/g, '').trim();
        console.log(jsonString);
        
        try {
          const parsedResponse = JSON.parse(jsonString);
          
          // Wrap the single object in an array if it's not already an array
          const vulnerabilitiesArray = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
          
          setSecurityVulnerabilities(vulnerabilitiesArray);
          setAiResponse("");
          setComplexityData(null);
        } catch (error) {
          console.error("Error parsing JSON response:", error);
          setAiResponse("Error parsing JSON response.");
          setSecurityVulnerabilities([]);
        }
      }
      else {
        const lines = result.split('\n');
        
        if (lines.length > 0) {
          lines[0] = lines[0].replace(/^#+\s*/, '');
          lines[0] = `<span style="font-size: 1.5em; font-weight: bold;">${lines[0]}</span>`;
        }
      
        const formattedResponse = marked.parse(lines.join('\n'));

        setAiResponse(formattedResponse);
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

  const handleFileUpload = (content) => {
    setTextareaValue(content);
  };

  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
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

