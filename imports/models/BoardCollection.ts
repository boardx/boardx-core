import { IBoardFilterOptions } from '../services/BoardService'
import { AppStateCollection } from './AppStateCollection'
import { BaseCollection } from './BaseCollection'
import type { IBoard } from '/imports/excalidraw/types'

export type BoardRecord = IBoard & {
  _id: string
  userid: string
  created_at: number
  last_updated: number
  favorite: boolean
}

export class BoardCollectionClass extends BaseCollection<BoardRecord> {
  constructor() {
    super('boards')
  }

  public async getLastCreatedBoard(userid: string): Promise<BoardRecord> {
    const documents = await this.collection
      .find({ userid }, { sort: { created_at: -1 }, limit: 1 })
      .fetchAsync()
    if (!documents.length) {
      const _id = await this.createNewBoard(userid)
      await AppStateCollection.setCurrentBoardId(userid, _id)
      return this.collection.findOneAsync({ _id }) as Promise<BoardRecord>
    }
    return documents[0] as BoardRecord
  }

  public async updateBoardById(boardId: string, board: Partial<IBoard>) {
    // TODO check "edit" permission here
    return this.collection.updateAsync(
      { _id: boardId },
      {
        $set: {
          last_updated: Date.now(),
          ...board
        }
      }
    )
  }

  public async updateBoard(board: IBoard) {
    const { id, files, elements } = board
    const values = { files, elements, last_updated: Date.now() }

    // TODO check "edit" permission here
    return this.collection.updateAsync({ _id: id }, { $set: values })
  }

  public async getBoardById(boardId: string): Promise<BoardRecord | null> {
    const document = await this.collection.findOneAsync({ _id: boardId })
    if (document != null) Object.assign(document, { id: document._id })
    return document as BoardRecord
  }

  public createNewBoard(userid: string): Promise<string> {
    return this.collection.insertAsync(this.generateEmptyBoard(userid))
  }

  public async getMyBoards(
    userid: string,
    options?: IBoardFilterOptions
  ): Promise<BoardRecord[] | null> {
    const query = { userid }
    if (options != null && options.favorite === true) {
      Object.assign(query, { favorite: true })
    }
    const lastCreatedSortTop = { created_at: -1 }
    return this.collection.find(query, { sort: lastCreatedSortTop }).fetchAsync() as Promise<
      BoardRecord[]
    >
  }

  private generateEmptyBoard(userid: string): Omit<BoardRecord, 'id' | '_id'> {
    return {
      userid,
      title: 'Untitled',
      created_at: Date.now(),
      last_updated: Date.now(),
      elements: [],
      files: {},
      favorite: false
    }
  }
}

export const BoardCollection = new BoardCollectionClass()
