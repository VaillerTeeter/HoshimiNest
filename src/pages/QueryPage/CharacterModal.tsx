import { Modal } from 'animal-island-ui';
import type { RelatedCharacter } from 'bangumi-api-client';

interface CharacterModalProps {
  open: boolean;
  loading: boolean;
  characters: RelatedCharacter[];
  onClose: () => void;
}

export function CharacterModal({
  open,
  loading,
  characters,
  onClose,
}: CharacterModalProps): React.JSX.Element {
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
                {ch.images?.medium !== undefined && ch.images.medium !== '' && (
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
