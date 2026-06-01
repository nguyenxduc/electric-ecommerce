import { Pagination as AntPagination } from 'antd'
import { useEffect } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  total?: number
  pageSize?: number
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  total,
  pageSize = 9
}: PaginationProps) => {
  // Calculate total items if not provided
  const totalItems = total || totalPages * pageSize

  // Add custom styles to the document head
  useEffect(() => {
    const styleId = 'custom-pagination-styles'

    // Remove existing styles if any
    const existingStyle = document.getElementById(styleId)
    if (existingStyle) {
      existingStyle.remove()
    }

    // Create new style element
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .custom-pagination .ant-pagination-item {
        border: none !important;
        background: transparent !important;
      }
      
      .custom-pagination .ant-pagination-item a {
        color: #9ca3af !important;
        font-size: 14px !important;
        transition: color 0.2s !important;
      }
      
      .custom-pagination .ant-pagination-item:hover a {
        color: #6b7280 !important;
      }
      
      .custom-pagination .ant-pagination-item-active {
        background: transparent !important;
        border: none !important;
      }
      
      .custom-pagination .ant-pagination-item-active a {
        color: #2563eb !important;
        font-weight: 500 !important;
        position: relative !important;
      }
      
      .custom-pagination .ant-pagination-item-active a::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: #2563eb;
        border-radius: 1px;
      }
      
      .custom-pagination .ant-pagination-prev,
      .custom-pagination .ant-pagination-next {
        border: none !important;
        background: transparent !important;
      }
      
      .custom-pagination .ant-pagination-prev .ant-pagination-item-link,
      .custom-pagination .ant-pagination-next .ant-pagination-item-link {
        border: none !important;
        background: transparent !important;
        color: #6b7280 !important;
        transition: color 0.2s !important;
      }
      
      .custom-pagination .ant-pagination-prev:hover .ant-pagination-item-link,
      .custom-pagination .ant-pagination-next:hover .ant-pagination-item-link {
        color: #374151 !important;
      }
      
      .custom-pagination .ant-pagination-disabled .ant-pagination-item-link {
        color: #d1d5db !important;
      }
      
      .custom-pagination .ant-pagination-jump-prev .ant-pagination-item-container .ant-pagination-item-link-icon,
      .custom-pagination .ant-pagination-jump-next .ant-pagination-item-container .ant-pagination-item-link-icon {
        color: #9ca3af !important;
      }
    `

    document.head.appendChild(style)

    // Cleanup function
    return () => {
      const styleToRemove = document.getElementById(styleId)
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [])

  return (
    <div className="flex justify-center mt-8 mb-8">
      <AntPagination
        current={currentPage}
        total={totalItems}
        pageSize={pageSize}
        onChange={onPageChange}
        showSizeChanger={false}
        showQuickJumper={false}
        showPrevNextJumpers={true}
        showTitle={false}
        className="custom-pagination"
      />
    </div>
  )
}

export default Pagination
