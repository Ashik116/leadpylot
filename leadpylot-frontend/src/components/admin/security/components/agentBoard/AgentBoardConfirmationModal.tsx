import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { HiExclamationTriangle } from "react-icons/hi2";
import CopyButton from "@/components/shared/CopyButton";

type TAgentBoardConfirmationModal = {
    isForceLogoutModalOpen: boolean;
    handleCloseLogoutModal: () => void;
    selectedSession: any;
    isLogoutLoading: boolean;
    handleForceLogout: () => void;
}

const AgentBoardConfirmationModal = ({ isForceLogoutModalOpen, handleCloseLogoutModal, selectedSession, isLogoutLoading, handleForceLogout }: TAgentBoardConfirmationModal) => {
    return (
        < Dialog isOpen={isForceLogoutModalOpen} onClose={handleCloseLogoutModal} width="450px" >
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-100 rounded-full">
                        <HiExclamationTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Force Logout User</h3>
                        <p className="text-sm text-gray-600">This action cannot be undone</p>
                    </div>
                </div>

                {selectedSession && (
                    <div className="mb-6 bg-slate-50 rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                        {selectedSession.userId?.login?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 capitalize">{selectedSession.userId?.login}</h4>
                                    <span className="text-xs text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                                        {selectedSession.userId?.role}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right text-sm text-slate-600">
                                <div>{selectedSession.geolocation?.city}, {selectedSession.geolocation?.country}</div>
                                <div className="flex items-center gap-1 mt-1">
                                    <span>{selectedSession.ipAddress}</span>
                                    <CopyButton value={selectedSession.ipAddress} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-6 p-4 border-l-4 border-red-400 bg-red-50">
                    <p className="text-sm text-red-700">
                        <strong>Warning:</strong> This user will be immediately signed out and will need to log in again to access the system.
                    </p>
                </div>

                <div className="flex items-center gap-3 justify-end">
                    <Button
                        variant="secondary"
                        onClick={handleCloseLogoutModal}
                        disabled={isLogoutLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleForceLogout}
                        disabled={isLogoutLoading}
                    >
                        {isLogoutLoading ? 'Logging out...' : 'Force Logout'}
                    </Button>
                </div>
            </div>
        </Dialog >
    )
}

export default AgentBoardConfirmationModal;