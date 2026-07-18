import { categoryById } from '../data/catalog'

/** Miniatura esercizio: foto se c'è, altrimenti emoji della categoria */
export default function ExerciseThumb({ image, category }) {
  if (image) return <img className="thumb" src={image} alt="" loading="lazy" />
  return <div className="thumb">{categoryById(category).emoji}</div>
}
