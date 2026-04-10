// const OldReclamteComponents = () => {
//     return (
//         <form className="space-y-4" onSubmit={handleSubmit}>
//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//                 {/* Show Project Name - highlighted if current user is the agent who made the request */}
//                 {/* <div>
//               <label className="block text-sm font-medium text-gray-700">Project Name</label>
//               <Input
//                 value={reclamation.project_name || 'N/A'}
//                 readOnly
//                 className={`mt-1 ${isCurrentUserAgent(reclamation) ? 'border-evergreen bg-sand-1/20' : ''}`}
//               />
//             </div> */}

//                 {/* Show Agent Login - highlight and show current username if current user is the agent */}
//                 {/* <div>
//               <label className="block text-sm font-medium text-gray-700">Agent Login</label>
//               {isCurrentUserAgent(reclamation) ? (
//                 <Input
//                   value={`${reclamation.agent_id?.login ?? ''} (You: ${currentUserName})`}
//                   readOnly
//                   className="border-evergreen bg-sand-1/20 mt-1"
//                 />
//               ) : (
//                 <Input value={reclamation.agent_id?.login ?? ''} readOnly className="mt-1" />
//               )}
//             </div> */}
//                 {/* <div>
//               <label className="block text-sm font-medium text-gray-700">Agent Email</label>
//               <Input value={reclamation.agent_id?.info?.email ?? ''} readOnly className="mt-1" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Agent Name</label>
//               <Input value={reclamation.agent_id?.info?.name ?? ''} readOnly className="mt-1" />
//             </div> */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead Name</label>
//                     <Input
//                         value={
//                             reclamation.lead_id && 'contact_name' in reclamation.lead_id
//                                 ? String(reclamation.lead_id.contact_name)
//                                 : ''
//                         }
//                         readOnly
//                         className="mt-1"
//                     />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead Email</label>
//                     <Input
//                         value={
//                             reclamation.lead_id && 'email_from' in reclamation.lead_id
//                                 ? String(reclamation.lead_id.email_from)
//                                 : ''
//                         }
//                         readOnly
//                         className="mt-1"
//                     />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead Phone</label>
//                     <Input value={reclamation.lead_id?.phone} readOnly className="mt-1" />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead Source No</label>
//                     <Input
//                         value={
//                             reclamation.lead_id && 'lead_source_no' in reclamation.lead_id
//                                 ? String(reclamation.lead_id.lead_source_no)
//                                 : ''
//                         }
//                         readOnly
//                         className="mt-1"
//                     />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead price</label>
//                     <Input value={reclamation.lead_id?.leadPrice} readOnly className="mt-1" />
//                 </div>
//                 {/* <div>
//               <label className="block text-sm font-medium text-gray-700">Provider</label>
//               <Input value={reclamation.lead_id?.provider || 'N/A'} readOnly className="mt-1" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Source</label>
//               <Input value={reclamation.lead_id?.source || 'N/A'} readOnly className="mt-1" />
//             </div> */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Reason</label>
//                     <Input value={reclamation.reason} readOnly className="mt-1" />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Response</label>
//                     {canUpdateStatus && isPending ? (
//                         <Input
//                             value={responseText}
//                             onChange={(e) => setResponseText(e.target.value)}
//                             rows={3}
//                             className="mt-1"
//                             placeholder="Enter your response to this reclamation"
//                         />
//                     ) : (
//                         <Input value={reclamation.response} readOnly className="mt-1" />
//                     )}
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Lead Date</label>
//                     <Input value={dateFormateUtils(reclamation.lead_id?.lead_date)} readOnly className="mt-1" />
//                 </div>
//                 {/* <div>
//               <label className="block text-sm font-medium text-gray-700">Updated At</label>
//               <Input value={dateFormateUtils(reclamation.updatedAt)} readOnly className="mt-1" />
//             </div> */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700">Status</label>
//                     <Select
//                         value={STATUS_OPTIONS.find((opt) => opt.value === status)}
//                         onChange={(val: { value: number; label: string } | null) =>
//                             setStatus(val?.value ?? null)
//                         }
//                         options={STATUS_OPTIONS}
//                         className="mt-1"
//                         isDisabled={submitting || !canUpdateStatus || !isPending}
//                     />
//                 </div>
//             </div>
//             <div>
//                 <Button
//                     type="submit"
//                     variant="solid"
//                     size="sm"
//                     loading={submitting}
//                     disabled={submitting || !canUpdateStatus || !isPending}
//                 >
//                     Update Status
//                 </Button>
//                 {!canUpdateStatus && (
//                     <p className="mt-2 text-sm text-red-500">
//                         Only Admin or Provider roles can update status
//                     </p>
//                 )}
//                 {!isPending && status !== 0 && (
//                     <p className="mt-2 text-sm text-red-500">Only pending reclamations can be updated</p>
//                 )}
//             </div>
//         </form>
//     )
// }