import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal } from 'lucide-react';

const SendButton = ({ onSubmit, loading }) => {
  return (
    <Button
      onClick={onSubmit}
      disabled={loading}
      className="rounded-xl px-6 h-11 shadow-md transition-all active:scale-95"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin mr-2" size={18} />
          Analyzing...
        </>
      ) : (
        <>
          Analyze Code
          <SendHorizontal className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
};

export default SendButton;

