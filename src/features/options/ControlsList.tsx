import { KEY_BINDINGS } from "../../game/input/bindings";

// Teclas de cada ação (mesma fonte do InputManager), entalhadas em plaquinhas
// de madeira como a pontuação do resultado.
export function ControlsList() {
  return (
    <>
      <dl className="controls-list">
        {KEY_BINDINGS.map(({ action, label, keys }) => (
          <div key={action} className="controls-list__row">
            <dt>{label}</dt>
            <dd>
              {keys.map(({ code, display }, index) => (
                <span key={code}>
                  {index > 0 && <span className="visually-hidden"> or </span>}
                  <kbd className="carved-key">{display}</kbd>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="option__hint">
        On touch screens, hold the on-screen buttons: movement at the bottom
        left, cannons at the bottom right. Landscape is recommended.
      </p>
    </>
  );
}
