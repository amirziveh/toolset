<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

// Tiptap CSS is imported globally in main.js

const store = useInvoiceStore();

const editor = ref(null);
const showHtmlView = ref(false);

// Initialize editor
onMounted(() => {
  editor.value = new Editor({
    extensions: [StarterKit],
    content: store.currentInvoice?.additionalDescription || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px]',
        dir: 'rtl'
      }
    },
    onUpdate: () => {
      const html = editor.value.getHTML();
      store.updateAdditionalDescription(html);
    }
  });
});

// Clean up editor
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});

// Toggle HTML view
function toggleHtmlView() {
  showHtmlView.value = !showHtmlView.value;
}

// Toolbar buttons
const toolbarButtons = [
  { name: 'bold', icon: 'bold', label: 'پررنگ' },
  { name: 'italic', icon: 'italic', label: 'مورب' },
  { name: 'underline', icon: 'underline', label: 'زیرخط' },
  { name: 'bulletList', icon: 'list-ul', label: 'لیست نقطه‌ای' },
  { name: 'orderedList', icon: 'list-ol', label: 'لیست شماره‌دار' }
];

// Handle toolbar button clicks
function onToolbarButtonClick(buttonName) {
  if (!editor.value) return;
  
  const chain = editor.value.chain().focus();
  
  switch (buttonName) {
    case 'bold':
      chain.toggleMark('bold');
      break;
    case 'italic':
      chain.toggleMark('italic');
      break;
    case 'underline':
      chain.toggleMark('underline');
      break;
    case 'bulletList':
      chain.toggleList('bulletList');
      break;
    case 'orderedList':
      chain.toggleList('orderedList');
      break;
  }
  
  chain.run();
}
</script>

<template>
  <div class="card">
    <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
      <i class="fa-solid fa-file-lines"></i> توضیحات
    </h3>
    
    <!-- Editor Toolbar -->
    <div class="flex flex-wrap gap-1 mb-2 p-2 rounded-lg" style="background:var(--input-bg);border:1px solid var(--card-border)">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.name"
        @click="onToolbarButtonClick(btn.name)"
        :class="[
          'px-2 py-1 text-xs rounded border transition-all',
          editor?.isActive(btn.name)
            ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
        :title="btn.label"
      >
        <i :class="['fa-solid fa-' + btn.icon, btn.name === 'bulletList' ? 'fa-list-ul' : btn.name === 'orderedList' ? 'fa-list-ol' : btn.icon]"></i>
      </button>
      
      <!-- HTML View Toggle -->
      <button
        @click="toggleHtmlView"
        :class="[
          'px-2 py-1 text-xs rounded border transition-all ml-auto',
          showHtmlView 
            ? 'border-green-500 bg-green-100 dark:bg-green-900/30' 
            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
        title="نمایش HTML"
      >
        <i class="fa-solid fa-code"></i>
      </button>
    </div>
    
    <!-- Editor Content -->
    <div class="border rounded-lg overflow-hidden" style="border-color:var(--card-border)">
      <editor-content 
        ref="editorContent"
        :editor="editor"
        class="min-h-[200px] p-3 sm:p-4"
      />
    </div>
    
    <!-- HTML View Panel -->
    <div v-if="showHtmlView" class="mt-2">
      <label class="field-label text-xs mb-1">HTML Source</label>
      <textarea
        v-model="store.currentInvoice.additionalDescription"
        @input="store.updateAdditionalDescription($event.target.value)"
        class="input-field font-mono text-xs min-h-[100px] w-full"
        placeholder="HTML content..."
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
/* Tiptap editor styles */
:deep(.ProseMirror) {
  min-height: 200px;
  direction: rtl;
  text-align: right;
}

:deep(.ProseMirror:focus) {
  outline: none;
}

:deep(.ProseMirror ul) {
  padding-right: 1.2em;
  padding-left: 0;
}

:deep(.ProseMirror ol) {
  padding-right: 1.4em;
  padding-left: 0;
}

:deep(.ProseMirror li) {
  margin-bottom: 0.25em;
}

/* RTL support for lists */
:deep(.ProseMirror ul li::before) {
  margin-right: -1.2em;
  margin-left: 0;
}

:deep(.ProseMirror ol li::before) {
  margin-right: -1.4em;
  margin-left: 0;
}
</style>