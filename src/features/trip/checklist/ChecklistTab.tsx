import { useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, CheckSquare, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Field, TextInput } from '../../../components/Field';
import { Menu } from '../../../components/Menu';
import { Modal } from '../../../components/Modal';
import { ProgressBar } from '../../../components/ProgressBar';
import { useConfirm } from '../../../components/Confirm';
import { SUGGESTED_TASKS } from '../../../domain/catalog';
import { createTask } from '../../../domain/factories';
import type { ChecklistTask } from '../../../domain/types';
import { removeById, upsertById } from '../../../lib/collections';
import { daysBetween, formatDate, todayISO } from '../../../lib/dates';
import { TabHeader } from '../shared';
import type { TabProps } from '../types';

/** Pendentes primeiro (por prazo), depois concluídas. */
export function sortTasks(tasks: ChecklistTask[]): ChecklistTask[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.dueDate || '9999-12-31';
    const db = b.dueDate || '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function ChecklistTab({ trip, update }: TabProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editing, setEditing] = useState<ChecklistTask | null>(null);
  const confirm = useConfirm();

  const tasks = useMemo(() => sortTasks(trip.tasks), [trip.tasks]);
  const done = trip.tasks.filter((t) => t.done).length;
  const total = trip.tasks.length;
  const progress = total ? done / total : 0;

  const setTasks = (fn: (list: ChecklistTask[]) => ChecklistTask[]) => update((t) => ({ ...t, tasks: fn(t.tasks) }));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (await setTasks((list) => [...list, createTask(title.trim(), dueDate)])) {
      setTitle('');
      setDueDate('');
    }
  };

  const missingSuggestions = SUGGESTED_TASKS.filter(
    (s) => !trip.tasks.some((t) => t.title.toLowerCase() === s.toLowerCase()),
  );

  const addSuggestions = () => void setTasks((list) => [...list, ...missingSuggestions.map((s) => createTask(s))]);

  const remove = async (task: ChecklistTask) => {
    if (await confirm({ title: 'Excluir tarefa?', message: `“${task.title}” será removida.` })) {
      await setTasks((list) => removeById(list, task.id));
    }
  };

  return (
    <>
      <TabHeader
        title="Checklist"
        subtitle="Tarefas e providências antes e durante a viagem."
        action={
          missingSuggestions.length > 0 && total > 0 ? (
            <button className="btn btn--ghost" onClick={addSuggestions}>
              <Sparkles size={15} /> Sugestões
            </button>
          ) : undefined
        }
      />

      {total > 0 && (
        <div className="progress-card">
          <div className="progress-card__top">
            <span className="progress-card__value">{Math.round(progress * 100)}%</span>
            <span className="muted">
              {done} de {total} {total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
            </span>
          </div>
          <ProgressBar value={progress} tone={progress === 1 ? 'success' : 'default'} label="Progresso do checklist" />
        </div>
      )}

      <form className="quick-add" onSubmit={add}>
        <input
          className="input quick-add__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova tarefa — ex.: contratar seguro-viagem"
          aria-label="Nova tarefa"
        />
        <input
          className="input quick-add__date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Prazo (opcional)"
          title="Prazo (opcional)"
        />
        <button className="btn btn--primary" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> <span className="hide-sm">Adicionar</span>
        </button>
      </form>

      {total === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} />}
          title="Nada pendente por aqui"
          text="Adicione suas próprias tarefas ou comece com uma lista de sugestões."
          action={
            <button className="btn btn--ghost" onClick={addSuggestions}>
              <Sparkles size={15} /> Usar sugestões
            </button>
          }
        />
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => void setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))}
              onEdit={() => setEditing(task)}
              onDelete={() => void remove(task)}
            />
          ))}
        </ul>
      )}

      <TaskEditModal
        task={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (task) => {
          if (await setTasks((list) => upsertById(list, task))) setEditing(null);
        }}
      />
    </>
  );
}

function DueLabel({ date, done }: { date: string; done: boolean }) {
  if (!date) return null;
  const diff = daysBetween(todayISO(), date) ?? 0;
  let tone = '';
  let text = formatDate(date, false);
  if (!done) {
    if (diff < 0) {
      tone = 'due--late';
      text = `Atrasada · ${text}`;
    } else if (diff === 0) {
      tone = 'due--soon';
      text = 'Hoje';
    } else if (diff <= 7) {
      tone = 'due--soon';
      text = diff === 1 ? 'Amanhã' : `Em ${diff} dias`;
    }
  }
  return (
    <span className={`due ${tone}`}>
      <CalendarClock size={12} /> {text}
    </span>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: ChecklistTask; onToggle(): void; onEdit(): void; onDelete(): void }) {
  return (
    <li className={`task ${task.done ? 'is-done' : ''}`}>
      <input type="checkbox" className="checkbox" checked={task.done} onChange={onToggle} aria-label={`Concluir “${task.title}”`} />
      <span className="task__title" onClick={onToggle}>
        {task.title}
      </span>
      <DueLabel date={task.dueDate} done={task.done} />
      <Menu
        actions={[
          { label: 'Editar', icon: <Pencil size={15} />, onSelect: onEdit },
          { label: 'Excluir', icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
        ]}
      />
    </li>
  );
}

function TaskEditModal({ task, onClose, onSubmit }: { task: ChecklistTask | null; onClose(): void; onSubmit(task: ChecklistTask): void }) {
  const [draft, setDraft] = useState<ChecklistTask | null>(task);
  const [lastTask, setLastTask] = useState(task);
  if (task !== lastTask) {
    // Sincroniza o rascunho quando outra tarefa é aberta.
    setLastTask(task);
    setDraft(task);
  }
  return (
    <Modal
      open={task !== null}
      title="Editar tarefa"
      size="sm"
      onClose={onClose}
      onSubmit={() => draft && draft.title.trim() && onSubmit({ ...draft, title: draft.title.trim() })}
    >
      {draft && (
        <>
          <Field label="Tarefa">
            <TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Prazo (opcional)">
            <TextInput type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          </Field>
          <label className="check-line">
            <input type="checkbox" className="checkbox" checked={draft.done} onChange={(e) => setDraft({ ...draft, done: e.target.checked })} />
            Concluída
          </label>
        </>
      )}
    </Modal>
  );
}
