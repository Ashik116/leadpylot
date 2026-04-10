'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FormItem, FormContainer } from '@/components/ui/Form';
import {
  useDialPatterns,
  useAddDialPattern,
  useDeleteDialPattern,
} from '@/services/hooks/useFreePBXOutboundRoutes';

interface DialPatternFormData {
  pattern: string;
  prepend: string;
  prefix: string;
}

interface OutboundRouteDialPatternsProps {
  routeId: number;
}

const OutboundRouteDialPatterns = ({ routeId }: OutboundRouteDialPatternsProps) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: patternsData, isLoading } = useDialPatterns(routeId);
  const addPatternMutation = useAddDialPattern();
  const deletePatternMutation = useDeleteDialPattern();

  const patterns = patternsData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DialPatternFormData>({
    defaultValues: {
      pattern: '',
      prepend: '',
      prefix: '',
    },
  });

  const onSubmit = async (data: DialPatternFormData) => {
    try {
      await addPatternMutation.mutateAsync({
        routeId,
        data: {
          pattern: data.pattern,
          prepend: data.prepend,
          prefix: data.prefix,
        },
      });
      reset();
      setShowAddForm(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (patternId: number) => {
    if (window.confirm('Are you sure you want to delete this dial pattern?')) {
      try {
        await deletePatternMutation.mutateAsync({ routeId, patternId });
      } catch {
        // Error handled by mutation
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading dial patterns...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add Pattern Button */}
      {!showAddForm && (
        <div className="flex justify-end">
          <Button
            variant="solid"
            icon={<ApolloIcon name="plus" />}
            onClick={() => setShowAddForm(true)}
          >
            Add Dial Pattern
          </Button>
        </div>
      )}

      {/* Add Pattern Form */}
      {showAddForm && (
        <Card>
          <div className="p-4">
            <h4 className="mb-4 font-semibold">Add New Dial Pattern</h4>
            <FormContainer>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormItem
                  label="Pattern"
                  invalid={!!errors.pattern}
                  errorMessage={errors.pattern?.message}
                  className="w-full"
                >
                  <Input
                    type="text"
                    placeholder="e.g., NXXNXXXXXX or 0ZXXXXXXXX."
                    disabled={addPatternMutation.isPending}
                    {...register('pattern', {
                      required: 'Pattern is required',
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    N = 2-9, Z = 1-9, X = 0-9, . = wildcard
                  </p>
                </FormItem>

                <FormItem
                  label="Prepend (Optional)"
                  invalid={!!errors.prepend}
                  errorMessage={errors.prepend?.message}
                  className="w-full"
                >
                  <Input
                    type="text"
                    placeholder="Digits to prepend"
                    disabled={addPatternMutation.isPending}
                    {...register('prepend')}
                  />
                </FormItem>

                <FormItem
                  label="Prefix (Optional)"
                  invalid={!!errors.prefix}
                  errorMessage={errors.prefix?.message}
                  className="w-full"
                >
                  <Input
                    type="text"
                    placeholder="Match pattern prefix"
                    disabled={addPatternMutation.isPending}
                    {...register('prefix')}
                  />
                </FormItem>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      reset();
                    }}
                    disabled={addPatternMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="solid"
                    loading={addPatternMutation.isPending}
                  >
                    Add Pattern
                  </Button>
                </div>
              </form>
            </FormContainer>
          </div>
        </Card>
      )}

      {/* Patterns List */}
      {patterns.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-gray-500">
            <ApolloIcon name="info-circle" className="mx-auto mb-2 text-3xl" />
            <p>No dial patterns configured for this route</p>
            <p className="text-sm">Add a pattern to start routing calls</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <Card key={pattern.id}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Badge className="bg-gray-9 text-gray-2">#{pattern.seq}</Badge>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {pattern.match_pattern_pass}
                      </span>
                      {pattern.match_pattern_prefix && (
                        <Badge className="bg-ocean-9 text-ocean-2">
                          Prefix: {pattern.match_pattern_prefix}
                        </Badge>
                      )}
                      {pattern.prepend_digits && (
                        <Badge className="bg-emerald-9 text-emerald-2">
                          Prepend: {pattern.prepend_digits}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="plain"
                  size="xs"
                  className="text-rust-2 hover:text-rust-1"
                  icon={<ApolloIcon name="trash" />}
                  onClick={() => handleDelete(pattern.id)}
                  loading={deletePatternMutation.isPending}
                  title="Delete pattern"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutboundRouteDialPatterns;

