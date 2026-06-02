import { Modal } from 'animal-island-ui';
import type { RelatedPerson } from 'bangumi-api-client';
import type { JSX } from 'react';

interface PersonModalProps {
  open: boolean;
  loading: boolean;
  persons: RelatedPerson[];
  onClose: () => void;
}

export function PersonModal({ open, loading, persons, onClose }: PersonModalProps): JSX.Element {
  return (
    <Modal
      open={open}
      title="演职人员"
      onClose={onClose}
      footer={null}
      typewriter={false}
      width={600}
      maskClosable
    >
      {loading ? (
        <p className="modal-loading">加载中…</p>
      ) : (
        <div className="modal-person-scroll">
          <div className="modal-person-list">
            {persons.map((p) => (
              <div key={p.id} className="modal-person-row">
                {Boolean(p.images?.medium) && (
                  <img className="modal-person-img" src={p.images?.medium} alt={p.name} />
                )}
                <div className="modal-person-info">
                  <span className="modal-person-name">{p.name}</span>
                  <span className="modal-person-relation">{p.relation}</span>
                  {Boolean(p.eps) && <span className="modal-person-eps">{p.eps}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
