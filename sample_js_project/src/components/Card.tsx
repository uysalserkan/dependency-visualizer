// Card component
import { formatDate } from '../utils/helpers';

export function Card({ title, content }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{content}</p>
      <small>{formatDate(new Date())}</small>
    </div>
  );
}
