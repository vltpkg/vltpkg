import { useEffect, useState } from "react";
import { fetchFsLs } from "@/lib/fetch-fs.ts";
import { FileExplorerDialog } from "@/components/file-explorer/file-explorer.tsx";

import type { FileExplorerItem } from "@/components/file-explorer/file-explorer.tsx";

export const FileExplorerView = ({
  onSelect,
}: {
  onSelect?: (item: FileExplorerItem) => void;
}) => {
  const [items, setItems] = useState<FileExplorerItem[]>([]);
  const [rootDirs, setRootDirs] = useState<FileExplorerItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchRoot = async () => {
      try {
        const rootItems = await fetchFsLs({});
        const dirs = rootItems.filter(
          (item) => item.type === "directory" && !item.name.startsWith("."),
        );
        setRootDirs(dirs);
        if (!currentPath) setItems(rootItems);
      } catch {
        setRootDirs([]);
        if (!currentPath) setItems([]);
      }
    };
    void fetchRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const next = await fetchFsLs({ path: currentPath });
        setItems(next);
      } catch (e) {
        console.error("Error fetching items:", e);
        setItems([]);
      }
    };
    void fetchItems();
  }, [currentPath]);

  const loadChildren = async (path: string) => {
    try {
      return await fetchFsLs({ path });
    } catch {
      return [];
    }
  };

  return (
    <FileExplorerDialog
      items={items}
      rootDirs={rootDirs}
      currentPath={currentPath}
      onPathChange={setCurrentPath}
      onSelect={onSelect}
      loadChildren={loadChildren}
    />
  );
};
