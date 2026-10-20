import { Link } from 'react-router';
import { Backpack, CalendarCheck, Paintbrush, PartyPopper, ShieldCheck, Truck } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { ProductCard } from '../../components/catalog/ProductCard';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { getAvailability, listCategories, listProducts } from '../../services/catalog';
import { useSettings } from '../../context/SettingsContext';

export function HomePage() {
  const { settings } = useSettings();
  const featured = useAsync(async () => {
    const [products, availability, categories] = await Promise.all([
      listProducts({ featuredOnly: true, limit: 8 }), getAvailability(), listCategories(),
    ]);
    return { products, availability, categories };
  }, []);

  return (
    <>
      <section className="confetti-bg relative overflow-hidden border-b border-ink-100 bg-gradient-to-br from-brand-50 via-cream to-sun-100">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-brand-700 shadow-sm">
              <PartyPopper className="h-4 w-4" aria-hidden /> {settings?.business.city ?? 'La Paz, Bolivia'}
            </p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl md:text-6xl">
              Todo para tu fiesta, <span className="text-brand-600">hecho con cariño</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-700">
              Articulos de cotillon listos para llevar y trabajos personalizados: mochilas, piñatas 2D y globos con serigrafia con la tematica que elijas :D
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/catalogo" size="lg">Ver catálogo</ButtonLink>
              <ButtonLink to="/catalogo?tipo=personalizado" size="lg" variant="sun">Personaliza tu pedido</ButtonLink>
            </div>
          </div>
          <div className="relative hidden h-80 md:block" aria-hidden>
            <svg viewBox="0 0 300 260" className="floaty absolute inset-0 h-full w-full">
              <ellipse cx="110" cy="95" rx="55" ry="66" fill="var(--color-brand-500)" />
              <ellipse cx="190" cy="110" rx="48" ry="58" fill="var(--color-sun-400)" />
              <ellipse cx="150" cy="70" rx="38" ry="46" fill="var(--color-mint-300)" />
              <ellipse cx="230" cy="60" rx="26" ry="32" fill="var(--color-grape-300)" />
              <path d="M110 161 C120 200 140 215 150 255 M190 168 C180 205 160 220 150 255 M150 116 L150 255 M230 92 C220 150 180 200 150 255"
                stroke="var(--color-ink-400)" strokeWidth="2" fill="none" />
              <ellipse cx="92" cy="72" rx="9" ry="16" fill="#fff" opacity=".45" />
              <ellipse cx="176" cy="88" rx="8" ry="14" fill="#fff" opacity=".45" />
            </svg>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          { icon: Backpack, title: 'Mochilas personalizadas', text: 'Con el nombre y los colores de la fiesta.' },
          { icon: Paintbrush, title: 'Piñatas 2D', text: 'Decoradas a mano segun la tematica que nos pidas.' },
          { icon: PartyPopper, title: 'Globos con serigrafía', text: 'Con nombre, edad o el logotipo de tu evento.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex items-start gap-3 p-5">
            <span className="rounded-2xl bg-brand-100 p-3 text-brand-700"><Icon className="h-6 w-6" aria-hidden /></span>
            <div><h2 className="text-lg">{title}</h2><p className="text-sm text-ink-500">{text}</p></div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-3xl">Destacados</h2>
          <Link to="/catalogo" className="font-bold text-brand-700 hover:underline">Ver todo →</Link>
        </div>
        {featured.loading && <Spinner />}
        {featured.error && <ErrorState message={featured.error} onRetry={featured.reload} />}
        {featured.data && featured.data.products.length === 0 && (
          <p className="text-ink-500">Pronto publicaremos nuestros productos destacados.</p>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.data?.products.map((p) => <ProductCard key={p.id} product={p} available={featured.data?.availability.get(p.id)} />)}
        </div>
        {featured.data && featured.data.categories.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-2xl">Categorías</h2>
            <div className="flex flex-wrap gap-2">
              {featured.data.categories.map((c) => (
                <Link key={c.id} to={`/catalogo?categoria=${c.slug}`} className="rounded-full border-2 border-ink-200 bg-white px-4 py-2 font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 sm:grid-cols-3">
        {[
          { icon: CalendarCheck, title: 'Fechas realistas', text: 'Calculamos la fecha de entrega segun la carga de trabajo del taller' },
          { icon: Truck, title: 'Recojo o entrega', text: 'Recoge en tienda o recibe tu pedido en tu domicilio dentro de La Paz' },
          { icon: ShieldCheck, title: 'Pagos claros', text: 'Cada anticipo y pago queda registrado con su comprobante' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl bg-ink-900 p-5 text-white">
            <Icon className="h-6 w-6 text-sun-400" aria-hidden />
            <h2 className="mt-2 text-lg text-white">{title}</h2>
            <p className="text-sm text-ink-200">{text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
