import { Show, createSignal, createUniqueId, onCleanup } from 'solid-js';
import { ImagePlus, Upload, X } from 'lucide-solid';
import { useAuth } from '~/lib/auth-context';
import { IMAGE_ACCEPT, IMAGE_TYPES, validateImageFile } from '~/lib/image-upload';

interface RecipeImageInputProps {
  value: string;
  disabled?: boolean;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

export default function RecipeImageInput(props: RecipeImageInputProps) {
  const { user } = useAuth();
  const id = createUniqueId();
  const [uploading, setUploading] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [error, setError] = createSignal('');
  const [message, setMessage] = createSignal('');
  let fileInput: HTMLInputElement | undefined;
  let controller: AbortController | undefined;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    controller?.abort();
    props.onUploadingChange(false);
  });

  const uploadImage = async (file?: File) => {
    if (!file || uploading() || props.disabled) return;
    setError('');
    setMessage('');
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    const currentUser = user();
    if (!currentUser) { setError('Sign in to upload recipe images.'); return; }

    controller = new AbortController();
    const signal = controller.signal;
    setUploading(true);
    props.onUploadingChange(true);
    setProgress(0);
    try {
      // Keep the upload SDK out of the initial recipe-page bundle.
      const { upload } = await import('@vercel/blob/client');
      if (signal.aborted) return;
      const extension = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
      const blob = await upload(`recipe-images/${currentUser.id}/${crypto.randomUUID()}.${extension}`, file, {
        access: 'public',
        handleUploadUrl: '/api/recipes/image-upload',
        contentType: file.type,
        abortSignal: signal,
        onUploadProgress: ({ percentage }) => {
          if (!disposed) setProgress(Math.round(percentage));
        },
      });
      if (!disposed && !signal.aborted) {
        props.onChange(blob.url);
        setMessage('Image uploaded. Save the recipe to keep this change.');
      }
    } catch (err) {
      if (!disposed && !signal.aborted) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message.includes('client token')
          ? 'Couldn’t start the upload. Check that image storage is configured and you’re signed in, then try again.'
          : message);
      }
    } finally {
      if (!disposed) {
        setUploading(false);
        props.onUploadingChange(false);
      }
    }
  };

  return (
    <section class="bg-gray-50 dark:bg-stone-800 rounded-lg p-4 space-y-4" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} class="font-semibold text-gray-900 dark:text-stone-100">Recipe image</h3>
      <Show when={props.value} fallback={
        <div class="rounded-lg border border-dashed border-gray-300 dark:border-stone-600 py-8 text-center text-gray-500 dark:text-stone-400">
          <ImagePlus size={28} class="mx-auto mb-2" aria-hidden="true" />
          <p class="text-sm">Add a photo of your dish</p>
        </div>
      }>
        <img src={props.value} alt="Recipe image preview" class="w-full h-48 object-cover rounded-lg" />
      </Show>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label="Choose recipe image"
        class="hidden"
        disabled={uploading() || props.disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          void uploadImage(file);
        }}
      />
      <div class="flex flex-wrap gap-2">
        <button type="button" class="primary-button text-sm disabled:opacity-50" disabled={uploading() || props.disabled} onClick={() => fileInput?.click()}>
          <Upload size={16} aria-hidden="true" /> {uploading() ? 'Uploading…' : props.value ? 'Replace image' : 'Upload image'}
        </button>
        <Show when={props.value && !uploading()}>
          <button type="button" class="secondary-button text-sm disabled:opacity-50" disabled={props.disabled} onClick={() => { props.onChange(''); setError(''); setMessage(''); }}>
            <X size={16} aria-hidden="true" /> Remove
          </button>
        </Show>
        <Show when={uploading()}>
          <button type="button" class="secondary-button text-sm" onClick={() => controller?.abort()}>Cancel upload</button>
        </Show>
      </div>
      <p class="text-xs text-gray-500 dark:text-stone-400">JPEG, PNG, WebP, GIF, or AVIF. Up to 10 MB.</p>
      <Show when={uploading()}>
        <div role="status" class="text-sm text-gray-600 dark:text-stone-300">
          Uploading image… {progress()}%
          <progress max="100" value={progress()} aria-label="Image upload progress" class="w-full accent-emerald-600" />
        </div>
      </Show>
      <Show when={error()}><p role="alert" class="text-sm text-red-600 dark:text-red-400 break-words">{error()}</p></Show>
      <Show when={message()}><p role="status" class="text-sm text-emerald-700 dark:text-emerald-300">{message()}</p></Show>
      <div>
        <label for={`${id}-url`} class="block text-sm font-medium text-gray-700 dark:text-stone-300 mb-2">Or use an image URL</label>
        <input
          id={`${id}-url`}
          type="url"
          value={props.value}
          disabled={uploading() || props.disabled}
          onInput={(event) => { props.onChange(event.currentTarget.value); setMessage(''); setError(''); }}
          placeholder="https://example.com/image.jpg"
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-700 text-gray-900 dark:text-stone-100 disabled:opacity-50"
        />
      </div>
    </section>
  );
}
