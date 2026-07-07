import { projectInitials } from '../utils/projectColors';

export default function ProjectAvatar({ project, size = 28 }) {
  return (
    <span
      className="project-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.4),
        background: project.color,
      }}
    >
      {projectInitials(project.name)}
    </span>
  );
}
