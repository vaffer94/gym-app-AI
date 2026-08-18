import { categoryById } from '../data/catalog'
import Icona from '../icons'

/** Miniatura esercizio: foto se c'è, altrimenti icona della categoria */
export default function ExerciseThumb({ image, category }) {
  if (image) return <img className="thumb" src={image} alt="" loading="lazy" />
  return (
    <div className="thumb">
      <Icona nome={categoryById(category).icona} size="1.6rem" />
    </div>
  )
}
