import Button from '@/components/ui/Button';
import ApolloIcon from "@/components/ui/ApolloIcon";

type TWhisperCallModalProps = {
    setWhisperCallId: (whisperCallId: string | null) => void;
    whisperInputRef: React.RefObject<HTMLTextAreaElement | null>;
    isLoading: boolean;
    submitWhisper: () => void;
}
const WhisperCallModal = ({ setWhisperCallId, whisperInputRef, isLoading, submitWhisper }: TWhisperCallModalProps) => {

    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-100 rounded">
                        <ApolloIcon name="bubble-question" className="w-4 h-4 text-yellow-700" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">Whisper Justification</h4>
                </div>
                <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-100"
                    onClick={() => { setWhisperCallId(null); }}
                >
                    <ApolloIcon name="times" className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <div className="p-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Enter justification for this supervisor action</label>
                <textarea
                    ref={whisperInputRef}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Coaching the agent on customer escalation"
                />
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
                <Button
                    variant="secondary"
                    onClick={() => { setWhisperCallId(null); }}
                >
                    Cancel
                </Button>
                <Button
                    variant="default"
                    disabled={isLoading || !(whisperInputRef.current?.value || '').trim()}
                    onClick={submitWhisper}
                >
                    OK
                </Button>
            </div>
        </div>
    </div>)

}

export default WhisperCallModal;