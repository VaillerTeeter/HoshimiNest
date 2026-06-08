import { Modal } from 'animal-island-ui';
import type { RelatedPerson } from 'bangumi-api-client';

interface PersonsModalProps {
  open: boolean;
  loading: boolean;
  persons: RelatedPerson[];
  onClose: () => void;
}

export function PersonsModal({
  open,
  loading,
  persons,
  onClose,
}: PersonsModalProps): React.JSX.Element {
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
                {p.images?.medium !== undefined && p.images.medium.length > 0 && (
                  <img className="modal-person-img" src={p.images.medium} alt={p.name} />
                )}
                <div className="modal-person-info">
                  <span className="modal-person-name">{p.name}</span>
                  <span className="modal-person-relation">{p.relation}</span>
                  {p.eps.length > 0 && <span className="modal-person-eps">{p.eps}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
