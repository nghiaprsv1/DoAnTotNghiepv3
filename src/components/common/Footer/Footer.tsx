import { Icon } from '@components/ui/Icon'

export function Footer() {
  return (
    <footer className="w-full py-12 px-8 mt-auto bg-surface-container-low">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
        <div className="col-span-2 md:col-span-1">
          <span className="font-headline font-bold text-lg text-on-surface block mb-4">
            ViệtVibe
          </span>
          <p className="font-body text-sm tracking-wide text-on-surface/70 mb-6">
            Redefining the way you discover and experience the beauty of Vietnam.
          </p>
          <div className="flex gap-4">
            <Icon name="public" className="text-primary cursor-pointer hover:opacity-70 transition-opacity" />
            <Icon name="share" className="text-primary cursor-pointer hover:opacity-70 transition-opacity" />
            <Icon name="favorite" className="text-primary cursor-pointer hover:opacity-70 transition-opacity" />
          </div>
        </div>

        <div>
          <h5 className="font-headline font-bold text-on-surface mb-4">Explore</h5>
          <ul className="space-y-3">
            {['About Vietnam', 'Destinations', 'Travel Guides'].map((label) => (
              <li key={label}>
                <a
                  href="#"
                  className="font-body text-sm tracking-wide text-on-surface/70 hover:text-primary transition-all duration-300"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-headline font-bold text-on-surface mb-4">Resources</h5>
          <ul className="space-y-3">
            {['Safety Tips', 'Contact Support', 'Privacy Policy'].map((label) => (
              <li key={label}>
                <a
                  href="#"
                  className="font-body text-sm tracking-wide text-on-surface/70 hover:text-primary transition-all duration-300"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="font-headline font-bold text-on-surface mb-4">Newsletter</h5>
          <div className="bg-surface-container-highest/50 p-2 rounded-2xl flex">
            <input
              type="email"
              placeholder="Your email"
              className="bg-transparent border-none focus:ring-0 text-sm px-3 w-full outline-none"
            />
            <button
              type="button"
              className="bg-primary text-on-primary p-2 rounded-xl hover:bg-primary-dim transition-colors"
              aria-label="Subscribe"
            >
              <Icon name="send" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-12 border-t border-surface-container mt-12 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-body text-sm tracking-wide text-on-surface/70">
          © {new Date().getFullYear()} ViệtVibe Travel. The Digital Concierge.
        </span>
        <div className="flex gap-6">
          {['Facebook', 'Instagram', 'Twitter'].map((label) => (
            <a
              key={label}
              href="#"
              className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
