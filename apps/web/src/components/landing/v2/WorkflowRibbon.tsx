import styles from './workflow-ribbon.module.css'

const phrases = ['Achados organizados por órgão', 'Seu laudo, seu estilo', 'Esquemas visuais integrados', 'Do celular para a Sala do Auxiliar', 'A revisão final é sempre sua']

export default function WorkflowRibbon() {
  return (
    <div className={styles.ribbon} tabIndex={0} role="region" aria-label="O fluxo LaudoUSG">
      <p className="sr-only">{phrases.join('. ')}.</p>
      <div className={styles.track} aria-hidden="true">
        {[0, 1].map(copy => <div className={styles.group} key={copy}>
          {phrases.map(phrase => <span key={phrase}><i />{phrase}</span>)}
        </div>)}
      </div>
    </div>
  )
}
