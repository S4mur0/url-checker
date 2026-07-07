export default function AkamaiBadge({ protected: isProtected }) {
  return (
    <span className={`badge ${isProtected ? 'protected' : 'unprotected'}`}>
      {isProtected ? 'PROTEGIDO' : 'SEM PROTEÇÃO'}
    </span>
  );
}
