interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroupProps {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function FilterGroup({
  label,
  options,
  selected,
  onChange,
}: FilterGroupProps): React.JSX.Element {
  const allActive = selected.size === 0;

  function toggle(value: string): void {
    if (value === '') {
      onChange(new Set());
      return;
    }
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  }

  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-pills">
        <button
          type="button"
          className={`filter-pill${allActive ? ' filter-pill--active' : ''}`}
          onClick={() => {
            toggle('');
          }}
        >
          全部
        </button>
        {options.map((opt) => (
          <button
            type="button"
            key={opt.value}
            className={`filter-pill${selected.has(opt.value) ? ' filter-pill--active' : ''}`}
            onClick={() => {
              toggle(opt.value);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
