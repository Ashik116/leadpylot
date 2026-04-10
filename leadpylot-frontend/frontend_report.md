# Frontend Analysis Report

## Pages (Routes)

- `/access-denied`
- `/accounts/notifications`
- `/admin/banks`
- `/admin/banks/[id]`
- `/admin/banks/create`
- `/admin/bonus-amount`
- `/admin/bonus-amount/[id]`
- `/admin/bonus-amount/create`
- `/admin/email-system`
- `/admin/email-templates`
- `/admin/email-templates/create`
- `/admin/email-templates/edit`
- `/admin/fonts`
- `/admin/freepbx-extensions`
- `/admin/freepbx-trunks`
- `/admin/import-leads`
- `/admin/mailservers`
- `/admin/mailservers/[id]`
- `/admin/mailservers/create`
- `/admin/payment-terms`
- `/admin/payment-terms/[id]`
- `/admin/payment-terms/create`
- `/admin/pdf`
- `/admin/recent-imports`
- `/admin/reportings`
- `/admin/security`
- `/admin/sources`
- `/admin/sources/[id]`
- `/admin/stages`
- `/admin/stages/[id]`
- `/admin/table-settings`
- `/admin/todos`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/users/create`
- `/admin/voip-servers`
- `/admin/voip-servers/[id]`
- `/admin/voip-servers/create`
- `/dashboards`
- `/dashboards/accepted-offers`
- `/dashboards/agent-live-lead`
- `/dashboards/agent-recycle-lead`
- `/dashboards/calendar`
- `/dashboards/calls`
- `/dashboards/confirmation`
- `/dashboards/documents`
- `/dashboards/holds`
- `/dashboards/home`
- `/dashboards/leads`
- `/dashboards/leads-bank`
- `/dashboards/leads/[id]`
- `/dashboards/leads/archived`
- `/dashboards/leads/pending-leads`
- `/dashboards/leads/projects`
- `/dashboards/live-leads`
- `/dashboards/mails`
- `/dashboards/meetings`
- `/dashboards/netto`
- `/dashboards/offers`
- `/dashboards/openings`
- `/dashboards/payment`
- `/dashboards/payment-vouchers`
- `/dashboards/projects`
- `/dashboards/projects/[id]`
- `/dashboards/projects/close-projects`
- `/dashboards/projects/close-projects/[id]`
- `/dashboards/projects/create`
- `/dashboards/reclamations`
- `/dashboards/reclamations/[id]`
- `/dashboards/reclamations/pending-reclamations`
- `/dashboards/recycle-leads`
- `/dashboards/tasks/[taskId]`
- `/dashboards/todo`
- `/forgot-password`
- `/profile`
- `/reset-password`
- `/sign-in`

## Components

### Root
- ProjectDoubleTapCell.tsx

### admin
- ProjectEmailSyncComponent.tsx

### admin/security
- BlockedDevices.tsx
- BlockedIPs.tsx
- FailedLoginAttempts.tsx
- SuccessfulLogins.tsx

### admin/security/components/agentBoard
- AgentBoard.tsx
- AgentBoardConfirmationModal.tsx

### admin/security/components/securityDashboard
- ActiveSession.tsx
- FailedCountries.tsx
- FailedLogin.tsx
- RecentSuccessFullLogin.tsx
- SecurityCard.tsx
- SecurityDashboard.tsx
- SecurityDashboardSkeleton.tsx
- SessionDetailsModal.tsx

### auth/ForgotPassword
- ForgotPassword.tsx
- ForgotPasswordForm.tsx

### auth/OtpVerification
- OtpVerification.tsx
- OtpVerificationForm.tsx
- index.tsx

### auth/ResetPassword
- ResetPassword.tsx
- ResetPasswordForm.tsx

### auth/SignIn
- SignIn.tsx
- SignInForm.tsx

### auth/sidebar
- AuthSidebar.tsx

### characters
- black-character.tsx
- eyeball.tsx
- orange-character.tsx
- purple-character.tsx
- yellow-character.tsx

### debug
- Phase1ValidationDashboard.tsx

### layouts/PostLoginLayout
- PostLoginLayout.tsx

### layouts/PostLoginLayout/components
- DataExchange.tsx
- DynamicFilters.tsx
- FrameLessSide.tsx
- HeaderEnd.tsx
- HeaderStart.tsx
- MobileSearchOverlay.tsx
- PageTitleDisplay.tsx
- SyncStatusPill.tsx

### layouts/PostLoginLayout/contexts
- OpeningsViewContext.tsx

### layouts/PostLoginLocation/components
- DynamicFilters.tsx

### providers
- ApiUrlRouteProvider.tsx
- CurrentUserProvider.tsx
- JsSIPProvider.tsx
- NotificationSyncInitializer.tsx
- NotificationSyncProvider.tsx
- QueryProvider.tsx
- SIPProvider.tsx
- SocketProvider.tsx
- index.tsx

### providers/AuthProvider
- AuthProvider.tsx
- SessionContext.tsx
- SessionProvider.tsx

### shared
- AccessDenied.tsx
- ActionLink.tsx
- AgentDoubleTapCell.tsx
- AsyncMultiSelect.tsx
- AsyncSelect.tsx
- AuthorityCheck.tsx
- BatchInlineEdit.tsx
- CalendarView.tsx
- CallScheduleDialog.tsx
- CellInlineEdit.tsx
- Chart.tsx
- ConfirmDialog.tsx
- ConfirmationInput.tsx
- ConnectionHealthDashboard.tsx
- ConnectionStatusBadge.tsx
- ConnectionStatusIndicator.tsx
- Container.tsx
- CopyButton.tsx
- CustomSelect.tsx
- DataTable.tsx
- DebouceInput.tsx
- DocumentPreviewDialog.tsx
- DocumentTypeOptions.tsx
- DownloadImport.tsx
- DownloadImportButton.tsx
- DownloadOffersImports.tsx
- DraggableDropdown.tsx
- DraggableFilterList.tsx
- EmailSyncComponent.tsx
- ExcelViewer.tsx
- ExcelViewerDialog.tsx
- IconText.tsx
- ImportHistoryPagination.tsx
- ImportResultsDisplay.tsx
- InlineEditField.tsx
- Loading.tsx
- LoadingSpinner.tsx
- NavToggle.tsx
- NotFound.tsx
- OtpInput.tsx
- PageDashboardWrapper.tsx
- PasswordInput.tsx
- ReactSelectWrapper.tsx
- RoleGuard.tsx
- SelectComponent.tsx
- SmartDropdown.tsx
- StatusBadge.tsx
- StatusIndicator.tsx
- ToggleDrawer.tsx
- TruncatedText.tsx

### shared/ActionBar
- ActionDropDown.tsx
- CommonActionBar.tsx
- FiltersDropdown.tsx
- QuickGroupByFilterOptions.tsx

### shared/AssignmentDoubleClickModal
- AssignmentCell.tsx
- GlobalAssignmentModal.tsx
- index.tsx

### shared/BaseTable
- BaseTable.tsx

### shared/BulkSearchModal
- BulkSearchModal.tsx

### shared/BulkSearchResultsHeader
- BulkSearchResultsHeader.tsx

### shared/CustomCard
- CustomCard.tsx

### shared/DataTable/components
- DataTableBody.tsx
- DataTableHeader.tsx
- DataTablePagination.tsx
- DataTableRow.tsx

### shared/DataTableOptimizedVersion
- DataTableOptimized.tsx

### shared/ExportDialog
- ExportDialog.tsx

### shared/FontManagement
- FontManager.tsx
- FontSelector.tsx
- index.tsx

### shared/GanttChart
- GanttChart.tsx
- TaskListHeader.tsx
- TaskListTable.tsx
- TooltipContent.tsx
- index.tsx

### shared/GlobalSearch
- GlobalSearch.tsx

### shared/LogoPreview
- LogoPreview.tsx

### shared/Masonry
- Masonry.tsx

### shared/PdfTemplateSettings
- TemplateSettingsDialog.tsx
- index.tsx

### shared/RichTextEditor
- RichTextEditor.tsx

### shared/RichTextEditor/toolButtons
- ToolButton.tsx
- ToolButtonBlockquote.tsx
- ToolButtonBold.tsx
- ToolButtonBulletList.tsx
- ToolButtonCode.tsx
- ToolButtonCodeBlock.tsx
- ToolButtonHeading.tsx
- ToolButtonHorizontalRule.tsx
- ToolButtonItalic.tsx
- ToolButtonOrderedList.tsx
- ToolButtonParagraph.tsx
- ToolButtonRedo.tsx
- ToolButtonStrike.tsx
- ToolButtonUndo.tsx

### shared/SkeletonLoading
- HeaderSkeleton.tsx

### shared/TaskDrawer
- TaskDrawer.tsx

### shared/card
- CommonCard.tsx

### shared/form
- BaseFormComponent.tsx
- DatePicker.tsx
- FormField.tsx
- TimePicker.tsx

### shared/loaders
- BankDetailsSkeleton.tsx
- DynamicFiltersShimmer.tsx
- FormPreloader.tsx
- GroupByFilterShimmer.tsx
- MediaSkeleton.tsx
- StatusFilterShimmer.tsx
- TableRowSkeleton.tsx
- TableShimmer.tsx
- TextBlockSkeleton.tsx

### template
- AgentAliasDisplay.tsx
- Footer.tsx
- FrameLessGap.tsx
- Header.tsx
- LayoutBase.tsx
- LocaleProvider.tsx
- Logo.tsx
- MobileNav.tsx
- PageContainer.tsx
- ProjectSelector.tsx
- Search.tsx
- SideNav.tsx
- SideNavLogo.tsx
- SideNavToggle.tsx
- UserProfileDropdown.tsx

### template/Navigation
- NavigationContext.tsx
- NavigationProvider.tsx

### template/Notification
- Notification.tsx
- NotificationBody.tsx
- NotificationDisplay.tsx
- NotificationIcon.tsx
- NotificationToggle.tsx
- ProfessionalNotificationDropdown.tsx
- TabbedNotificationBody.tsx
- index.tsx

### template/Notification/_components
- NotificationLeads.tsx
- NotificationOffer.tsx

### template/Phone
- CallCenter.tsx
- CallDiagnostics.tsx
- CallKeypad.tsx
- CallSessionItem.tsx
- Phone.tsx
- PhoneToggle.tsx
- VoIPStatus.tsx
- index.tsx

### template/Theme
- ThemeContext.tsx
- ThemeProvider.tsx

### template/VerticalMenuContent
- VerticalCollapsedMenuItem.tsx
- VerticalMenuContent.tsx
- VerticalMenuIcon.tsx
- VerticalSingleMenuItem.tsx

### ui/AgentEditDialog
- AgentEditDialog.tsx

### ui/AgentSelectionDialog
- AgentSelectionDialog.tsx

### ui/Alert
- Alert.tsx
- index.tsx

### ui/ApolloIcon
- index.tsx

### ui/Avatar
- Avatar.tsx
- AvatarGroup.tsx
- index.tsx

### ui/Badge
- Badge.tsx
- index.tsx

### ui/Button
- Button.tsx
- index.tsx

### ui/Card
- Card.tsx
- index.tsx

### ui/Checkbox
- Checkbox.tsx
- Group.tsx
- context.tsx
- index.tsx

### ui/CloseButton
- CloseButton.tsx
- index.tsx

### ui/DatePicker
- BasePicker.tsx
- Calendar.tsx
- CalendarBase.tsx
- DatePicker.tsx
- DatePickerRange.tsx
- DateTimepicker.tsx
- RangeCalendar.tsx
- index.tsx

### ui/DatePicker/tables
- DateTable.tsx
- Header.tsx
- MonthTable.tsx
- YearTable.tsx

### ui/DatePicker/tables/components
- Day.tsx
- Month.tsx

### ui/DatePicker/utils
- formatYear.tsx

### ui/Dialog
- Dialog.tsx
- index.tsx

### ui/Drawer
- Drawer.tsx
- index.tsx

### ui/Dropdown
- Dropdown.tsx
- DropdownItem.tsx
- DropdownMenu.tsx
- DropdownSub.tsx
- DropdownSubItem.tsx
- DropdownToggle.tsx

### ui
- FilePreview.tsx
- Modal.tsx
- NavigationBadge.tsx

### ui/Form
- Form.tsx
- FormContainer.tsx
- FormItem.tsx
- index.tsx

### ui/Input
- Input.tsx
- index.tsx

### ui/InputGroup
- Addon.tsx
- InputGroup.tsx
- index.tsx

### ui/Menu
- Menu.tsx
- MenuCollapse.tsx
- MenuGroup.tsx
- MenuItem.tsx
- index.tsx

### ui/Menu/context
- collapseContext.tsx
- groupContext.tsx
- menuContext.tsx

### ui/MenuItem
- index.tsx

### ui/Notification
- Notification.tsx
- index.tsx

### ui/Pagination
- Next.tsx
- Pagers.tsx
- Pagination.tsx
- Prev.tsx
- Total.tsx
- index.tsx

### ui/Progress
- Circle.tsx
- Line.tsx
- Progress.tsx
- index.tsx

### ui/Radio
- Group.tsx
- Radio.tsx
- context.tsx
- index.tsx

### ui/ScrollArea
- ScrollArea.tsx

### ui/ScrollBar
- ScrollBar.tsx
- index.tsx

### ui/Segment
- Segment.tsx
- SegmentItem.tsx
- index.tsx

### ui/Select
- Option.tsx
- Select.tsx
- index.tsx

### ui/Skeleton
- Skeleton.tsx
- index.tsx

### ui/Spinner
- Spinner.tsx

### ui/StatusIcon
- StatusIcon.tsx
- index.tsx

### ui/Steps
- StepItem.tsx
- Steps.tsx
- index.tsx

### ui/Switcher
- Switcher.tsx
- index.tsx

### ui/Table
- Sorter.tsx
- TBody.tsx
- TFoot.tsx
- THead.tsx
- Table.tsx
- Td.tsx
- Th.tsx
- Tr.tsx
- index.tsx

### ui/Tabs
- TabContent.tsx
- TabList.tsx
- TabNav.tsx
- Tabs.tsx
- index.tsx

### ui/Tag
- Tag.tsx
- index.tsx

### ui/TimeInput
- AmPmInput.tsx
- TimeInput.tsx
- TimeInputField.tsx
- TimeInputRange.tsx
- index.tsx

### ui/Timeline
- TimeLineItem.tsx
- Timeline.tsx
- index.tsx

### ui/Tooltip
- Arrow.tsx
- Tooltip.tsx
- index.tsx

### ui/Upload
- FileItem.tsx
- FileUploaderDialog.tsx
- ImageUploader.tsx
- PrelineFileUpload.tsx
- Upload.tsx
- index.tsx

### ui/toast
- ToastWrapper.tsx
- toast.tsx

