import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import {
  Cpu,
  Plus,
  Star,
  Archive,
  RotateCcw,
  Edit2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loading } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { ErrorMessage } from '../ui/ErrorMessage';
import {
  LLM_PROVIDERS_QUERY,
  CREATE_LLM_MODEL_MUTATION,
  UPDATE_LLM_MODEL_MUTATION,
  DEPRECATE_LLM_MODEL_MUTATION,
  REACTIVATE_LLM_MODEL_MUTATION,
  SET_DEFAULT_LLM_MODEL_MUTATION,
  LlmProvidersQueryResult,
  LlmProvider,
  LlmModel,
  CreateLlmModelInput,
  UpdateLlmModelInput,
} from '../../api/operations/llm';

export function ModelsPanel() {
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<LlmModel | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider | null>(null);

  const [{ data, fetching, error }, reexecuteQuery] = useQuery<LlmProvidersQueryResult>({
    query: LLM_PROVIDERS_QUERY,
  });

  const [, createModel] = useMutation(CREATE_LLM_MODEL_MUTATION);
  const [, updateModel] = useMutation(UPDATE_LLM_MODEL_MUTATION);
  const [, deprecateModel] = useMutation(DEPRECATE_LLM_MODEL_MUTATION);
  const [, reactivateModel] = useMutation(REACTIVATE_LLM_MODEL_MUTATION);
  const [, setDefaultModel] = useMutation(SET_DEFAULT_LLM_MODEL_MUTATION);

  const toggleProvider = (providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const handleCreateModel = async (input: CreateLlmModelInput) => {
    await createModel({ input });
    setIsAddModelOpen(false);
    setSelectedProvider(null);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleUpdateModel = async (id: string, input: UpdateLlmModelInput) => {
    await updateModel({ id, input });
    setEditingModel(null);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDeprecateModel = async (id: string) => {
    await deprecateModel({ id });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleReactivateModel = async (id: string) => {
    await reactivateModel({ id });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultModel({ id });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const openAddModel = (provider: LlmProvider) => {
    setSelectedProvider(provider);
    setIsAddModelOpen(true);
  };

  if (fetching) return <Loading text="Loading models..." />;
  if (error) {
    return (
      <ErrorMessage
        message={error.message}
        onRetry={() => reexecuteQuery({ requestPolicy: 'network-only' })}
      />
    );
  }

  const providers = data?.llmProviders ?? [];

  if (providers.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="No providers configured"
        description="LLM providers need to be seeded in the database"
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isExpanded={expandedProviders.has(provider.id)}
            onToggle={() => toggleProvider(provider.id)}
            onAddModel={() => openAddModel(provider)}
            onEditModel={setEditingModel}
            onDeprecateModel={handleDeprecateModel}
            onReactivateModel={handleReactivateModel}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>

      {isAddModelOpen && selectedProvider && (
        <ModelFormModal
          provider={selectedProvider}
          onClose={() => {
            setIsAddModelOpen(false);
            setSelectedProvider(null);
          }}
          onSave={handleCreateModel as (input: CreateLlmModelInput | UpdateLlmModelInput) => Promise<void>}
        />
      )}

      {editingModel && (
        <ModelFormModal
          model={editingModel}
          onClose={() => setEditingModel(null)}
          onSave={(input) => handleUpdateModel(editingModel.id, input as UpdateLlmModelInput)}
        />
      )}
    </>
  );
}

function ProviderCard({
  provider,
  isExpanded,
  onToggle,
  onAddModel,
  onEditModel,
  onDeprecateModel,
  onReactivateModel,
  onSetDefault,
}: {
  provider: LlmProvider;
  isExpanded: boolean;
  onToggle: () => void;
  onAddModel: () => void;
  onEditModel: (model: LlmModel) => void;
  onDeprecateModel: (id: string) => void;
  onReactivateModel: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const activeModels = provider.models.filter((m) => m.status === 'ACTIVE');
  const deprecatedModels = provider.models.filter((m) => m.status === 'DEPRECATED');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{provider.displayName}</h3>
            <p className="text-sm text-gray-500">
              {activeModels.length} active model{activeModels.length !== 1 ? 's' : ''}
              {deprecatedModels.length > 0 && `, ${deprecatedModels.length} deprecated`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              provider.isEnabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {provider.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Rate limit: {provider.requestsPerMinute}/min, {provider.maxParallelRequests} parallel
            </span>
            <Button variant="ghost" size="sm" onClick={onAddModel}>
              <Plus className="w-4 h-4 mr-1" />
              Add Model
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {provider.models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                onEdit={() => onEditModel(model)}
                onDeprecate={() => onDeprecateModel(model.id)}
                onReactivate={() => onReactivateModel(model.id)}
                onSetDefault={() => onSetDefault(model.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelRow({
  model,
  onEdit,
  onDeprecate,
  onReactivate,
  onSetDefault,
}: {
  model: LlmModel;
  onEdit: () => void;
  onDeprecate: () => void;
  onReactivate: () => void;
  onSetDefault: () => void;
}) {
  const isDeprecated = model.status === 'DEPRECATED';

  return (
    <div
      className={`px-6 py-4 flex items-center justify-between ${
        isDeprecated ? 'bg-gray-50 opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isDeprecated ? 'bg-gray-200' : 'bg-teal-100'
          }`}
        >
          <Cpu className={`w-5 h-5 ${isDeprecated ? 'text-gray-400' : 'text-teal-600'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{model.displayName}</p>
            {model.isDefault && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                Default
              </span>
            )}
            {isDeprecated && (
              <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                Deprecated
              </span>
            )}
            {!model.isAvailable && !isDeprecated && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                No API Key
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {model.modelId} · ${model.costInputPerMillion}/M input, ${model.costOutputPerMillion}/M
            output
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isDeprecated && !model.isDefault && (
          <Button variant="ghost" size="sm" onClick={onSetDefault} title="Set as default">
            <Star className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
          <Edit2 className="w-4 h-4" />
        </Button>
        {isDeprecated ? (
          <Button variant="ghost" size="sm" onClick={onReactivate} title="Reactivate">
            <RotateCcw className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeprecate}
            title="Deprecate"
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <Archive className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ModelFormModal({
  provider,
  model,
  onClose,
  onSave,
}: {
  provider?: LlmProvider;
  model?: LlmModel;
  onClose: () => void;
  onSave: (input: CreateLlmModelInput | UpdateLlmModelInput) => Promise<void>;
}) {
  const isEditing = !!model;
  const [modelId, setModelId] = useState(model?.modelId ?? '');
  const [displayName, setDisplayName] = useState(model?.displayName ?? '');
  const [costInput, setCostInput] = useState(model?.costInputPerMillion?.toString() ?? '');
  const [costOutput, setCostOutput] = useState(model?.costOutputPerMillion?.toString() ?? '');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (isEditing) {
      await onSave({
        displayName: displayName || undefined,
        costInputPerMillion: costInput ? parseFloat(costInput) : undefined,
        costOutputPerMillion: costOutput ? parseFloat(costOutput) : undefined,
      });
    } else if (provider) {
      await onSave({
        providerId: provider.id,
        modelId,
        displayName,
        costInputPerMillion: parseFloat(costInput),
        costOutputPerMillion: parseFloat(costOutput),
        setAsDefault,
      });
    }

    setIsSaving(false);
  };

  const isValid = isEditing
    ? displayName || costInput || costOutput
    : modelId && displayName && costInput && costOutput;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Model' : `Add Model to ${provider?.displayName}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <Input
              label="Model ID"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., gpt-4o-mini"
              required
            />
          )}

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., GPT-4o Mini"
            required={!isEditing}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost per 1M Input Tokens ($)"
              type="number"
              step="0.01"
              min="0"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              placeholder="0.15"
              required={!isEditing}
            />
            <Input
              label="Cost per 1M Output Tokens ($)"
              type="number"
              step="0.01"
              min="0"
              value={costOutput}
              onChange={(e) => setCostOutput(e.target.value)}
              placeholder="0.60"
              required={!isEditing}
            />
          </div>

          {!isEditing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">Set as default for this provider</span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!isValid || isSaving} isLoading={isSaving}>
              {isEditing ? 'Save Changes' : 'Add Model'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
