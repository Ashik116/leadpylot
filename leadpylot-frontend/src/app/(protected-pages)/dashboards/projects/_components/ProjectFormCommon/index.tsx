'use client';

import RoleGuard from '@/components/shared/RoleGuard';
import BaseFormComponent from '@/components/shared/form/BaseFormComponent';
import { FieldDefinition } from '@/components/shared/form/types';
import Dialog from '@/components/ui/Dialog';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ProjectDetails as ProjectDetailsType } from '@/services/ProjectsService';
import classNames from '@/utils/classNames';
import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CommonLeadsDashboard from '../../../leads/_components/CommonLeadsDashboard';
import AgentTable from '../../[id]/AgentTable';
import { useProjectForm } from '../../_hooks/useProjectForm';
import useProjectHook from '../../_hooks/useProjectHook';
import { SidebarContent } from './SidebarContent';
import { SIDEBAR_TITLES } from './constants';
import { useProjectState } from './useProjectState';
import { useServerTriggers } from './useServerTriggers';
import { useSidebarLogic } from './useSidebarLogic';

interface ProjectDetailsProps {
  projectData?: ProjectDetailsType;
  isCreateComponent: boolean;
}

type FormMethods = {
  setValue: (name: string, value: any, options?: any) => void;
  getValues: (name?: string) => any;
  control: any;
  register: any;
  errors: any;
  reset?: (values?: any, options?: any) => void;
};

function ProjectFormCommon({ isCreateComponent, projectData }: ProjectDetailsProps) {
  const hook = useProjectHook({ isCreateComponent, projectData });
  const [formMethods, setFormMethods] = useState<FormMethods | null>(null);

  // Memoize formState to prevent unnecessary re-renders
  const formState = useMemo(
    () => ({
      sidebarVisible: hook.sidebarVisible,
      isEditing: hook.isEditing,
      projectCreated: hook.projectCreated,
      project: hook.project,
    }),
    [hook.sidebarVisible, hook.isEditing, hook.projectCreated, hook.project]
  );

  // Memoize formCallbacks to prevent unnecessary re-renders
  const formCallbacks = useMemo(
    () => ({
      setSelectedDropdown: hook.setSelectedDropdown,
      setSelectedBank: hook.setSelectedBank,
      setSelectedPdfTemplate: hook.setSelectedPdfTemplate,
      setLastSelectedType: hook.setLastSelectedType,
      setSidebarVisible: hook.setSidebarVisible,
      setSidebarKey: hook.setSidebarKey,
    }),
    [
      hook.setSelectedDropdown,
      hook.setSelectedBank,
      hook.setSelectedPdfTemplate,
      hook.setLastSelectedType,
      hook.setSidebarVisible,
      hook.setSidebarKey,
    ]
  );

  const { schema, defaultValues, fields } = useProjectForm({
    isCreateComponent,
    projectData,
    formState,
    formCallbacks,
  });

  const { isProjectOpen, setIsProjectOpen } = useProjectState({
    isCreateComponent,
    projectCreated: hook.projectCreated,
    project: hook.project,
    formMethods,
    voipServer: hook.voipServer,
    mailServer: hook.mailServer,
  });

  const searchParams = useSearchParams();
  const leadsViewFromQueryAppliedRef = useRef(false);
  useEffect(() => {
    if (isCreateComponent || leadsViewFromQueryAppliedRef.current) return;
    if (searchParams.get('view') === 'leads') {
      setIsProjectOpen(false);
      leadsViewFromQueryAppliedRef.current = true;
    }
  }, [isCreateComponent, searchParams, setIsProjectOpen]);

  useServerTriggers({
    lastSelectedType: hook.lastSelectedType,
    selectedDropdown: hook.selectedDropdown,
    sidebarVisible: hook.sidebarVisible,
    formMethods,
    voipServer: hook.voipServer,
    mailServer: hook.mailServer,
    results: hook.results,
    isCreateComponent,
    projectData,
  });

  useSidebarLogic({
    sidebarVisible: hook.sidebarVisible,
    lastSelectedType: hook.lastSelectedType,
    setSidebarKey: hook.setSidebarKey,
  });

  // Log form errors from BaseFormComponent (actual validation happens here)
  useEffect(() => {
    if (formMethods?.errors) {
      console.log('Form validation errors:', formMethods.errors);
    }
  }, [formMethods?.errors]);

  const submitForm = () => {
    const form = document.querySelector('form');
    form?.requestSubmit();
  };

  const showSidebarButton = hook.lastSelectedType && (
    <Button
      variant="solid"
      size="sm"
      onClick={() => hook.setSidebarVisible(!hook.sidebarVisible)}
      icon={
        <ApolloIcon name={hook.sidebarVisible ? 'arrow-right' : 'arrow-left'} className="text-sm" />
      }
    >
      {hook.sidebarVisible ? 'Hide' : 'Show'} Details
    </Button>
  );

  return (
    <>
      <div className="px-3 pb-20 space-y-4" style={{ display: isProjectOpen ? 'block' : 'none' }}>
        <div className="flex flex-col gap-4 overflow-hidden lg:flex-row">
          <div
            className={`w-full transition-all duration-300 ease-in-out ${hook.lastSelectedType && hook.sidebarVisible ? 'lg:w-1/2' : 'w-full'}`}
          >
            <Card className={classNames('w-full border-none', hook.projectCreated && 'rounded-b-none')}>
              <div className="space-y-4">
                {isCreateComponent ? (
                  <div className="flex justify-between">
                    <h1 className="text-lg">Create Project</h1>
                    <div className="flex items-center gap-2">
                      <Link href="/dashboards/projects" aria-label="Back to projects" title="Back to projects">
                        <Button
                          variant="default"
                          size="sm"
                          icon={<ApolloIcon name="arrow-left" className="text-sm" />}
                        />
                      </Link>
                      {showSidebarButton}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center justify-between">
                    <h1 className="line-clamp-1 capitalize text-sm">
                      {typeof projectData?.name === 'string' ? projectData.name : 'Project'} Details
                    </h1>
                    <div className="flex items-center gap-2">
                      {(!hook.lastSelectedType || !hook.sidebarVisible) && (
                        <>
                          <div className="text-sm text-gray-500">
                            {hook.getCurrentPosition()}/{hook.totalProjects}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="px-2 md:px-5"
                              size="sm"
                              onClick={hook.goToPreviousProject}
                              disabled={hook.getCurrentPosition() === 1}
                              icon={<ApolloIcon name="arrow-left" className="text-sm" />}
                            >
                              <span className="hidden md:block">Previous</span>
                            </Button>
                            <Button
                              className="px-2 md:px-5"
                              size="sm"
                              onClick={hook.goToNextProject}
                              disabled={hook.getCurrentPosition() === hook.totalProjects}
                              icon={<ApolloIcon name="arrow-right" className="text-sm" />}
                              iconAlignment="end"
                            >
                              <span className="hidden md:block">Next</span>
                            </Button>
                          </div>
                        </>
                      )}
                      <RoleGuard>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="px-2 md:px-4"
                          icon={!hook.isEditing ? <ApolloIcon name="pen" /> : undefined}
                          onClick={() =>
                            hook.isEditing
                              ? (hook.setIsEditing(false),
                                hook.setSidebarVisible(!hook.sidebarVisible))
                              : hook.setIsEditing(true)
                          }
                        >
                          <span className="hidden md:block">
                            {hook.isEditing ? 'Cancel' : 'Edit'}
                          </span>
                        </Button>
                        {showSidebarButton}
                        {(!hook.lastSelectedType || !hook.sidebarVisible) && (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="px-2 md:px-6"
                              icon={<ApolloIcon name="trash" className="text-md" />}
                              onClick={() => hook.setIsDeleteDialogOpen(true)}
                            >
                              <span className="hidden md:block">Delete</span>
                            </Button>
                            <Button
                              variant="solid"
                              size="sm"
                              className="bg-new hover:bg-new/80 px-2 text-white transition-colors duration-200 md:px-6"
                              onClick={() => setIsProjectOpen(!isProjectOpen)}
                              icon={
                                <ApolloIcon
                                  name={isProjectOpen ? 'users' : 'file'}
                                  className="text-md"
                                />
                              }
                            >
                              {isProjectOpen ? 'Manage Leads' : 'Open Project'}
                            </Button>
                          </>
                        )}
                      </RoleGuard>
                    </div>
                  </div>
                )}

                <BaseFormComponent
                  schema={schema}
                  fields={fields as FieldDefinition[]}
                  defaultValues={defaultValues}
                  onSubmit={hook.onSubmit}
                  handleSubmitInternally={false}
                  isLoading={isCreateComponent ? hook.projectCreated : !hook.isEditing}
                  actionButtons={{ submit: false, reset: false }}
                  onFormMethodsReady={setFormMethods}
                  formProps={{
                    disabled: isCreateComponent ? hook.projectCreated : !hook.isEditing,
                  }}
                />

                {isCreateComponent && !hook.projectCreated && (
                  <div className=" flex justify-end">
                    <Button
                      variant="solid"
                      disabled={hook.isPendingCreate}
                      loading={hook.isPendingCreate}
                      icon={<ApolloIcon name="plus" className="text-md" />}
                      onClick={submitForm}
                    >
                      {hook.isPendingCreate ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                )}

                {!isCreateComponent && hook.isEditing && (
                  <div className="flex justify-end md:col-span-2">
                    <Button
                      variant="solid"
                      icon={<ApolloIcon name="file" />}
                      loading={hook.isUpdating}
                      onClick={submitForm}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div
            className={`w-full transform space-y-4 transition-all duration-300 ease-in-out lg:w-1/2 ${hook.lastSelectedType && hook.sidebarVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            style={{ display: hook.lastSelectedType && hook.sidebarVisible ? 'block' : 'none' }}
          >
            <Card className="w-full border-none">
              <div className="flex h-full flex-col border-l-2 pl-2 xl:pl-4 border-gray-100">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm">{SIDEBAR_TITLES[hook.lastSelectedType || ''] || ''}</h2>
                </div>
                <SidebarContent
                  lastSelectedType={hook.lastSelectedType}
                  sidebarVisible={hook.sidebarVisible}
                  selectedDropdown={hook.selectedDropdown}
                  bankId={hook.bankId}
                  pdfTemplateId={hook.pdfTemplateId}
                  sidebarKey={hook.sidebarKey}
                  formMethods={formMethods}
                  setSidebarVisible={hook.setSidebarVisible}
                />
              </div>
            </Card>
          </div>
        </div>

        {(isCreateComponent ? hook.project : projectData) && (
          <AgentTable project={isCreateComponent ? hook.project! : projectData!} />
        )}
      </div>

      <div
        className="space-y-6"
        style={{ display: !isProjectOpen ? 'block' : 'none', transition: 'all 0.5s ease-in-out' }}
      >
        {!isProjectOpen && (
          <div className="min-w-0 w-full">
            <CommonLeadsDashboard
              pageTitle="Project Leads"
              tableName="project_leads"
              setIsProjectOpen={setIsProjectOpen}
              isProjectOpen={isProjectOpen}
              projectNameFromDetailsPage={projectData?.name as unknown as string}
              externalProjectId={projectData?._id as string}
              getCurrentPosition={hook.getCurrentPosition}
              goToPreviousProject={hook.goToPreviousProject}
              goToNextProject={hook.goToNextProject}
              projectData={projectData}
              hideGroupBy={false}
              hideProjectOption={true}
            />
          </div>
        )}
      </div>

      {!isCreateComponent && (
        <Dialog isOpen={hook.isDeleteDialogOpen} onClose={() => hook.setIsDeleteDialogOpen(false)}>
          <h4 className="mb-3">Delete Project</h4>
          <p className="mb-6">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="default" onClick={() => hook.setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={hook.handleDelete} loading={hook.isDeleting}>
              Delete
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export default ProjectFormCommon;
