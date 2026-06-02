import { Modal } from 'animal-island-ui';
import type { RelatedCharacter, RelatedPerson } from 'bangumi-api-client';
import type { JSX } from 'react';

interface CharactersModalProps {
  open: boolean;
  loading: boolean;
  characters: RelatedCharacter[];
  onClose: () => void;
}

export function CharactersModal({
  open,
  loading,
  characters,
  onClose,
}: CharactersModalProps): JSX.Element {
  return (
    <Modal
      open={open}
      title="角色"
      onClose={onClose}
      footer={null}
      typewriter={false}
      width={680}
      maskClosable
    >
      {loading ? (
        <p className="modal-loading">加载中…</p>
      ) : (
        <div className="modal-character-scroll">
          <div className="modal-character-grid">
            {characters.map((ch) => (
              <div key={ch.id} className="modal-character-card">
                {ch.images?.medium !== undefined && ch.images.medium.length > 0 && (
                  <img className="modal-character-img" src={ch.images.medium} alt={ch.name} />
                )}
                <div className="modal-character-info">
                  <span className="modal-character-name">{ch.name}</span>
                  <span className="modal-character-relation">{ch.relation}</span>
                  {ch.actors !== undefined && ch.actors.length > 0 && (
                    <span className="modal-character-cv">
                      CV：{ch.actors.map((a) => a.name).join(' / ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

interface PersonsModalProps {
  open: boolean;
  loading: boolean;
  persons: RelatedPerson[];
  onClose: () => void;
}

export function PersonsModal({ open, loading, persons, onClose }: PersonsModalProps): JSX.Element {
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
