<script lang="ts">
  import { env } from '$env/dynamic/public';

  // Set PUBLIC_KOFI_USERNAME in your .env to enable
  const username = env.PUBLIC_KOFI_USERNAME ?? '';
  const href = username ? `https://ko-fi.com/${username}` : 'https://ko-fi.com';
</script>

<a
  {href}
  target="_blank"
  rel="noreferrer"
  class="inline-flex items-center gap-1.5 py-1 pl-1.5 pr-1 text-foreground transition-[color,scale] duration-150 ease-out hover:text-foreground/70 active:scale-[0.96]"
>
  <svg viewBox="0 0 24 24" fill="none" class="h-3 w-3" aria-hidden="true">
    <path
      d="M4 8h12a4 4 0 0 1 0 8h-1.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path d="M4 8v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8H4Z" stroke="currentColor" stroke-width="1.5" />
    <path d="M9 3v2M12 2v3M15 3v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
  Buy us a Ko-fi
</a>
