import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import {
  SidebarMenuSub,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarSeparator,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar.jsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx'
import { useGraphStore } from '@/state/index.js'
import type { SavedQuery } from '@/state/types.js'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { selectQuery } from '@/components/queries/saved-item.jsx'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

const sublistVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const sublistItemVariants: Variants = {
  hidden: { opacity: 0, y: -1 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.1, ease: 'easeInOut' },
  },
}

const SidebarQueryProjectNav = () => {
  const navigate = useNavigate()
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const savedQueries = useGraphStore(state => state.savedQueries)
  const [projectQueries, setProjectQueries] = useState<SavedQuery[]>(
    [],
  )
  const [globalQueries, setGlobalQueries] = useState<SavedQuery[]>([])
  const graph = useGraphStore(state => state.graph)
  const [projectQueriesOpen, setProjectQueriesOpen] =
    useState<boolean>(false)
  const [globalQueriesOpen, setGlobalQueriesOpen] =
    useState<boolean>(false)
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const getProjectQueries = () => {
    if (graph) {
      const currentPath = graph.projectRoot
      const filteredQueries = savedQueries?.filter(query => {
        return query.context === currentPath
      })
      const filteredGlobalQueries = savedQueries?.filter(query => {
        return query.context.trim() === ''
      })
      setProjectQueries(filteredQueries ?? [])
      setGlobalQueries(filteredGlobalQueries ?? [])
    }
  }

  useEffect(() => {
    getProjectQueries()
  }, [savedQueries, graph])

  const runQuery = async (item: SavedQuery): Promise<void> => {
    await selectQuery({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context: item.context,
    })
  }

  const runGlobalQuery = async (item: SavedQuery): Promise<void> => {
    await selectQuery({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context: graph?.projectRoot ?? '',
    })
  }

  useEffect(() => {
    if (!sidebarOpen) {
      setProjectQueriesOpen(false)
      setGlobalQueriesOpen(false)
    }
  }, [sidebarOpen])

  if (globalQueries.length === 0 && projectQueries.length === 0)
    return null

  return (
    <>
      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="font-medium tracking-wide">
          Queries
        </SidebarGroupLabel>

        {globalQueries.length !== 0 && (
          <SidebarMenu>
            <Collapsible
              open={globalQueriesOpen}
              onOpenChange={setGlobalQueriesOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Global queries"
                    className="group cursor-default whitespace-nowrap"
                    onClick={
                      !sidebarOpen ?
                        () => setSidebarOpen(true)
                      : undefined
                    }>
                    {globalQueriesOpen ?
                      <FolderOpen />
                    : <Folder />}
                    <span>Global</span>
                    <ChevronRight
                      className="ml-auto transition-all duration-300 group-data-[state=open]:rotate-90"
                      size={16}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={sublistVariants}>
                      {globalQueries.map((query, idx) => (
                        <motion.div
                          key={idx}
                          variants={sublistItemVariants}>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              className="cursor-default truncate whitespace-nowrap"
                              onClick={() =>
                                void runGlobalQuery(query)
                              }>
                              {query.name}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </motion.div>
                      ))}
                    </motion.div>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        )}

        {projectQueries.length !== 0 && (
          <SidebarMenu>
            <Collapsible
              open={projectQueriesOpen}
              onOpenChange={setProjectQueriesOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Project queries"
                    className="group cursor-default whitespace-nowrap"
                    onClick={
                      !sidebarOpen ?
                        () => setSidebarOpen(true)
                      : undefined
                    }>
                    {projectQueriesOpen ?
                      <FolderOpen />
                    : <Folder />}
                    <span>Project</span>
                    <ChevronRight
                      className="ml-auto transition-all duration-300 group-data-[state=open]:rotate-90"
                      size={16}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={sublistVariants}>
                      {projectQueries.map((query, idx) => (
                        <motion.div
                          key={idx}
                          variants={sublistItemVariants}>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              className="cursor-default truncate whitespace-nowrap"
                              onClick={() => void runQuery(query)}>
                              {query.name}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </motion.div>
                      ))}
                    </motion.div>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        )}
      </SidebarGroup>
    </>
  )
}

export { SidebarQueryProjectNav }
