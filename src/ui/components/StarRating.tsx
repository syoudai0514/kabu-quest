export default function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex justify-center gap-1 text-3xl" aria-label={`ほし${stars}つ`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= stars ? 'kq-pop' : 'opacity-25'}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}
